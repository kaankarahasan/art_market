const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY || "sk_test_PLACEHOLDER");

admin.initializeApp();

// 1. Endpoint to create a PaymentIntent
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in to create a payment intent.");
  }

  const { amount, currency, productId, sellerId } = data;

  if (!amount || !productId) {
    throw new functions.https.HttpsError("invalid-argument", "Amount and productId are required.");
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // amount in the smallest currency unit (e.g. cents)
      currency: currency || "usd",
      metadata: {
        productId: productId,
        buyerId: context.auth.uid,
        sellerId: sellerId,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
    };
  } catch (error) {
    console.error("Error creating payment intent:", error);
    throw new functions.https.HttpsError("internal", "Unable to create payment intent.");
  }
});

// 2. Webhook to handle successful payments
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_PLACEHOLDER";

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook Error:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const { productId, buyerId, sellerId } = paymentIntent.metadata;

    if (productId) {
      try {
        const productRef = admin.firestore().collection("products").doc(productId);
        const productDoc = await productRef.get();
        
        if (productDoc.exists) {
          const productData = productDoc.data();
          
          // Update product status
          await productRef.update({
            isSold: true,
            status: "sold",
          });

          // Create notification for the seller
          if (sellerId) {
            await admin.firestore().collection("notifications").add({
              userId: sellerId,
              type: "PRODUCT_SOLD",
              productId: productId,
              productTitle: productData.title || "Ürün",
              message: `Tebrikler! '${productData.title || "Ürün"}' adlı eseriniz başarıyla satıldı!`,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              read: false,
              buyerId: buyerId,
            });
          }
          
          // Add sale record
          await admin.firestore().collection("sales").add({
            productId,
            buyerId,
            sellerId,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      } catch (dbError) {
        console.error("Database Error:", dbError);
        res.status(500).send("Database Update Error");
        return;
      }
    }
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send({ received: true });
});
