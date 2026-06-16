const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  updateOrder
} = require('../controllers/orderController');

router.route('/')
  .get(getOrders)
  .post(createOrder);

router.route('/:id')
  .put(updateOrder);

module.exports = router;
