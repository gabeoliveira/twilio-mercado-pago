const axios = require('axios');

const BASE_URL = 'https://api.mercadopago.com';

function getHeaders(context, idempotencyKey) {
  return {
    Authorization: `Bearer ${context.MERCADO_PAGO_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    'X-Idempotency-Key': idempotencyKey || generateIdempotencyKey()
  };
}

function generateIdempotencyKey() {
  return 'mp-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
}

exports.createPixPayment = async function (orderId, context, customer, phoneNumber, items = []) {
  const mappedItems = items.map(item => ({
    id: item.id.toString(),
    title: item.label.toString(),
    quantity: item.quantity,
    unit_price: item.amount
  }));

  const payload = {
    transaction_amount: mappedItems.reduce(
      (total, item) => total + item.unit_price * item.quantity,
      0
    ),
    description: `Pagamento do pedido ${orderId}`,
    payment_method_id: 'pix',
    external_reference: orderId,
    payer: {
      email: customer.email,
      first_name: customer.firstName,
      last_name: customer.lastName,
      identification: customer.identification // Optional: { type: 'CPF', number: '12345678909' }
    },
    metadata: {
      phone_number: phoneNumber,
      customer_name: customer.firstName
    },
    additional_info: {
      items: mappedItems,
      payer: {
        phone: {
          number: phoneNumber
        }
      }
    }
  };

  const headers = getHeaders(context, `pix-${orderId}`);

  const response = await axios.post(`${BASE_URL}/v1/payments`, payload, { headers });

  const { id, point_of_interaction } = response.data;

  return {
    mercadoPagoPaymentId: id,
    pixCode: point_of_interaction.transaction_data.qr_code,
    qrImageUrl: point_of_interaction.transaction_data.qr_code_base64,
    externalReference: orderId,
  };
};


exports.createCardPayment = async function (orderId, context, customer, phoneNumber, items = []) {
  const senderNumber = context.WHATSAPP_FROM_NUMBER.replace('+', '');
  const waReturnUrl = `https://wa.me/${senderNumber}`;

  const mappedItems = items.map(item => ({
    id: item.id.toString(),
    title: item.label.toString(),
    quantity: item.quantity,
    unit_price: item.amount,
    currency_id: 'BRL'
  }));

  const payload = {
    items: mappedItems,
    external_reference: `order-${orderId}`,
    payer: {
      email: customer.email,
      name: customer.firstName,
      surname: customer.lastName,
      identification: customer.identification // Optional
    },
    metadata: {
        phone_number: phoneNumber,
        customer_name: customer.firstName
    },
    additional_info: {
      payer: {
        phone: {
          number: phoneNumber
        }
      }
    },
    back_urls: {
      success: waReturnUrl,
      pending: waReturnUrl,
      failure: waReturnUrl
    },
    auto_return: 'approved',
    notification_url: context.MERCADO_PAGO_WEBHOOK_URL || undefined
  };

  const response = await axios.post(
    `${BASE_URL}/checkout/preferences`,
    payload,
    { headers: getHeaders(context) }
  );

  const { id, init_point } = response.data;

  return {
    mercadoPagoPreferenceId: id,
    paymentUrl: init_point,
    externalReference: `order-${orderId}`,
  };
};

exports.getPaymentStatus = async function (paymentId, context) {
  const response = await axios.get(`${BASE_URL}/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${context.MERCADO_PAGO_ACCESS_TOKEN}`,
    }
  });

  return response.data; // This will be the full payment object
};


