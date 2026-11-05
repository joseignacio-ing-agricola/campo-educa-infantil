export const offers = Object.freeze({
  huerta:{title:'Mi primera mini huerta',courses:['infantil-mini-huerta'],CLP:6990,USD:790},
  detectives:{title:'Detectives de la naturaleza',courses:['infantil-detectives'],CLP:6990,USD:790},
  agua:{title:'Guardianes del agua',courses:['infantil-guardianes-agua'],CLP:6990,USD:790},
  pack:{title:'Pack de las tres aventuras',courses:['infantil-mini-huerta','infantil-detectives','infantil-guardianes-agua'],CLP:16990,USD:1890}
});
export function price(id,currency){if(!offers[id]||!['CLP','USD'].includes(currency))throw new Error('Oferta o moneda no válida');return offers[id][currency];}
export function formatPrice(id,currency){const n=price(id,currency)/(currency==='USD'?100:1);return currency==='USD'?'US$'+n.toFixed(2).replace('.',','):'CLP $'+new Intl.NumberFormat('es-CL').format(n);}
export function purchaseLink(id,currency){const offer=offers[id];price(id,currency);const text=`Hola, soy un adulto responsable. Quiero solicitar ${offer.title} (${id}), precio piloto ${formatPrice(id,currency)}, pago único y 6 meses desde la activación. Incluye: ${offer.courses.join(', ')}. Mi país es: ____. Por favor confirma el medio de pago disponible, total final y condiciones antes de pagar.`;return 'https://wa.me/56977884978?text='+encodeURIComponent(text);}
export function savings(currency){return price('huerta',currency)+price('detectives',currency)+price('agua',currency)-price('pack',currency);}
