exports.sendPixCode = async function ({ context, pixCode, phoneNumber, paymentId, items }) {
  const client = context.getTwilioClient();
  const whatsappNumber = context.WHATSAPP_FROM_NUMBER;
  const contentSid = context.PAYMENT_CONTENT_SID;

  console.log(items);

  // Normalize phoneNumber
  const to = phoneNumber.startsWith('whatsapp:')
    ? phoneNumber
    : `whatsapp:${phoneNumber}`;

  // Calculate expiration timestamp (15 minutes from now)
  const expirationDate = Math.floor((Date.now() + 15 * 60 * 1000) / 1000).toString();

  const amount = items.reduce((acc, item) => {
    const itemTotal = (item.amount || 0) * (item.quantity || 1);
    return acc + itemTotal;
  }, 0).toFixed(2); // Ensures two decimal places, as string

  //const cleanPixCode = pixCode.replace(/\s+/g, '').trim();

  const contentVariables = {
    'payment_id': paymentId,
    'body': "Estamos quase lá! Agora é só efetuar o pagamento de seu pedido e já podemos concluir!",
    'merchant_name': "Owl Store",
    'code': pixCode,
    'key': 'abb90645-62c1-4767-9b91-f329cecb21de',
    'key_type': 'EVP',
    'subtotal_amount': amount,
    'total_amount': amount,
    'order_expiration': expirationDate,
    'items': JSON.stringify(items)

  }

  console.log('Content Variables:', contentVariables);

  const message = await client.messages.create({
    to,
    from: 'whatsapp:' + whatsappNumber,
    contentSid,
    contentVariables: JSON.stringify(contentVariables)
  });

  return message;
};

exports.sendCreditCardPaymentLink = async function ({ context, phoneNumber, preferenceId }) {
	const client = context.getTwilioClient();
	const whatsappNumber = context.WHATSAPP_FROM_NUMBER;
	const contentSid = context.CREDIT_CARD_CONTENT_SID;

	const to = phoneNumber.startsWith('whatsapp:')
		? phoneNumber
		: `whatsapp:${phoneNumber}`;

	// Only send the query string portion
	const contentVariables = {
		order_id: `checkout/v1/redirect?pref_id=${preferenceId}`
	};

	console.log('Sending credit card payment link with variables:', contentVariables);

	const message = await client.messages.create({
		to,
		from: `whatsapp:${whatsappNumber}`,
		contentSid,
		contentVariables: JSON.stringify(contentVariables)
	});

	return message;
};

