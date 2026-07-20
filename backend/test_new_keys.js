const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: 'rzp_test_TEYhKt96XRAfQq',
  key_secret: 'djjOQP7AOzoLy3KTJXoonu0g'
});

async function run() {
  try {
    const order = await razorpay.orders.create({
      amount: 1000,
      currency: 'INR',
      receipt: 'receipt_test'
    });
    console.log("SUCCESS:", order);
  } catch (error) {
    console.error("FAILED. Full error object:", error);
  }
}
run();
