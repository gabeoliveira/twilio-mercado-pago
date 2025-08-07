const mercadoPago = require(Runtime.getFunctions()['helpers/mercado-pago'].path);
const twilio = require('twilio');

exports.handler = async function (context, event, callback) {
  const { type, data } = event;

  if (type !== 'payment' || !data?.id) {
    return callback(null, { success: true });
  }

  const WHATSAPP_FROM = context.WHATSAPP_FROM_NUMBER;
  const CONTENT_SID = context.ORDER_STATUS_CONTENT_SID;

  try {
    const payment = await mercadoPago.getPaymentStatus(data.id, context);
    const { status, external_reference, metadata, transaction_amount, payer } = payment;

    console.log(metadata);

    const phoneNumber = metadata?.phone_number;
    if (!phoneNumber) {
      console.warn('[Webhook] No phone_number in metadata. Skipping WhatsApp message.');
      return callback(null, { success: true });
    }

    let additionalMessage;
    let statusLabel;

    switch (status) {
      case 'approved':
        statusLabel = 'APROVADO';
        additionalMessage = 'Agora é só aguardar.';
        break;
      case 'rejected':
        statusLabel = 'REJEITADO';
        additionalMessage = 'Por favor, tente novamente em alguns minutos ou tente com outro meio de pagamento.';
        break;
      default:
        console.log(`[Webhook] Status ${status} not handled. Skipping message.`);
        return callback(null, { success: true });
    }

    const name = metadata?.customer_name || payer?.first_name || 'cliente';

    const client = twilio(context.ACCOUNT_SID, context.AUTH_TOKEN);

    const message = await client.messages.create({
      from: `whatsapp:${WHATSAPP_FROM}`,
      to: `whatsapp:${phoneNumber}`,
      contentSid: CONTENT_SID,
      contentVariables: JSON.stringify({
        name,
        order_id: external_reference,
        status: statusLabel,
        additional_message: additionalMessage
      })
    });

    console.log(`[Webhook] WhatsApp content message sent to ${phoneNumber}: ${message.sid}`);
    return callback(null, { success: true });

  } catch (err) {
    console.error('[Webhook] Error:', err.message);
    return callback(null, { success: false, error: err.message });
  }
};
