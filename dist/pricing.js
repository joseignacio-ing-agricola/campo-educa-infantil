import {formatPrice,purchaseLink,offers} from './commercial-catalog.js';
const selector=document.getElementById('currency');
function render(){const currency=selector.value;document.querySelectorAll('[data-price]').forEach(n=>n.textContent=formatPrice(n.dataset.price,currency));document.querySelectorAll('[data-buy]').forEach(a=>{a.href=purchaseLink(a.dataset.buy,currency);a.target='_blank';a.rel='noopener noreferrer';});document.getElementById('pack-comparison').textContent='Los tres por separado: '+formatPrice('huerta',currency)+' × 3. Pack: '+formatPrice('pack',currency)+'.';}
selector.addEventListener('change',render);render();
