console.log('module-setup: Script loaded');
console.log('module-setup: window before:', Object.keys(window).length);

// Create fake module system
window.module = { exports: {} };
window.exports = window.module.exports;

console.log('module-setup: Created module:', window.module);
console.log('module-setup: Created exports:', window.exports);
console.log('module-setup: window after:', Object.keys(window).length);