const mercadoPagoHelper = require(Runtime.getFunctions()['helpers/mercado-pago'].path);
const twilioHelper = require(Runtime.getFunctions()['helpers/twilio'].path);

exports.handler = async function (context, event, callback) {
  const { items, paymentMethod, phoneNumber, payer, referenceId } = event;

  if (!items || !paymentMethod || !phoneNumber || !payer || !referenceId) {
    return callback(null, { success: false, error: 'Missing required fields' });
  }

  try {
    let paymentResult;
    let message;

    if (paymentMethod === 'PIX') {
      paymentResult = await mercadoPagoHelper.createPixPayment(
        referenceId,
        context,
        payer,
        phoneNumber,
        items
      );

      message = await twilioHelper.sendPixCode({
        context,
        pixCode: paymentResult.pixCode,
        phoneNumber,
        paymentId: referenceId,
        items
      });

    } else if (paymentMethod === 'CREDIT_CARD') {
        paymentResult = await mercadoPagoHelper.createCardPayment(
            referenceId,
            context,
            payer,
            phoneNumber,
            items
        );

        message = await twilioHelper.sendCreditCardPaymentLink({
            context,
            phoneNumber,
            preferenceId: paymentResult.mercadoPagoPreferenceId
        });


    } else {
      return callback(null, { success: false, error: 'Unsupported payment method' });
    }

    return callback(null, {
      success: true,
      referenceId,
      payment: paymentResult,
      message
    });

  } catch (err) {
    console.error('Payment failed:', JSON.stringify(err.response?.data || err.message, null, 2));
    return callback(null, { success: false, error: err.message });
  }
};
