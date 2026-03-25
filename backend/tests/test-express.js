const express = require('express');

console.log('express:', typeof express);
console.log('express.Router:', typeof express.Router);

const router = express.Router();

console.log('router:', typeof router);
console.log('router.get:', typeof router.get);

console.log('✅ TEST PASSED - Express Router funciona!');