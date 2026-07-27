const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: 'rzp_live_TIU5Dx6JzUVZMX',
  key_secret: 'dOzbZxJ9ePQwlZ4fsPrJUzh9'
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
