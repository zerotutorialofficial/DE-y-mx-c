'use strict';
// Tidak membutuhkan internet, framework, atau proses build.
const $ = id => document.getElementById(id);
const state = { m: 0, c: 0, triangleDx: 3 };
const NS = 'http://www.w3.org/2000/svg';
const X = x => 350 + x * 30.8;
const Y = y => 350 - y * 30.8;
const fmt = n => String(Object.is(n, -0) ? 0 : Number(n.toFixed(8))).replace('-', '−');
function element(tag, attrs, text) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}
function segment(group, x1, y1, x2, y2, attrs = {}) {
  group.append(element('line', { x1: X(x1), y1: Y(y1), x2: X(x2), y2: Y(y2), ...attrs }));
}
function initGrid() {
  const grid = $('grid');
  grid.append(element('rect', { x:42, y:42, width:616, height:616, fill:'#fff', stroke:'#dce4ee' }));
  for (let i = -10; i <= 10; i++) {
    const color = i === 0 ? '#8191a8' : '#e4eaf2';
    segment(grid,i,-10,i,10,{stroke:color,'stroke-width':i===0?1.5:1});
    segment(grid,-10,i,10,i,{stroke:color,'stroke-width':i===0?1.5:1});
    if (i !== 0) {
      grid.append(element('text',{x:X(i),y:Y(0)+18,'text-anchor':'middle'},fmt(i)));
      grid.append(element('text',{x:X(0)-9,y:Y(i)+4,'text-anchor':'end'},fmt(i)));
    }
  }
  grid.append(element('text',{x:X(0)-8,y:Y(0)+18,'text-anchor':'end'},'0'));
  grid.append(element('text',{x:675,y:Y(0)+5,class:'axis-label'},'x'));
  grid.append(element('text',{x:X(0)+8,y:25,class:'axis-label'},'y'));
}
function equation(m,c) {
  let rhs = m===0 ? '' : m===1 ? 'x' : m===-1 ? '−x' : `${fmt(m)}x`;
  if (c!==0) rhs += rhs ? ` ${c<0?'−':'+'} ${fmt(Math.abs(c))}` : fmt(c);
  return `y = ${rhs || '0'}`;
}
// Clip the infinite line to the square before converting to SVG coordinates.
function endpoints(m,c) {
  if (m===0) return [[-10,c],[10,c]];
  let left=-10, right=10;
  const a=(-10-c)/m, b=(10-c)/m;
  left=Math.max(left,Math.min(a,b));
  right=Math.min(right,Math.max(a,b));
  return left<=right ? [[left,m*left+c],[right,m*right+c]] : [];
}
// Native MathML typesetting uses installed mathematical fonts and works offline.
function renderEquation(m,c) {
  const ns='http://www.w3.org/1998/Math/MathML';
  const math=document.createElementNS(ns,'math');
  const add=(tag,text)=>{const n=document.createElementNS(ns,tag);n.textContent=text;math.append(n);};
  add('mi','y');add('mo','=');
  if(m!==0){
    if(m<0)add('mo','\u2212');
    if(Math.abs(m)!==1)add('mn',fmt(Math.abs(m)));
    add('mi','x');
  }
  if(c!==0){
    if(m!==0||c<0)add('mo',c<0?'\u2212':'+');
    add('mn',fmt(Math.abs(c)));
  }else if(m===0){add('mn','0');}
  $('equation').replaceChildren(math);
}
function render() {
  const {m,c}=state;
  const eq=equation(m,c);
  renderEquation(m,c);
  $('equation').setAttribute('aria-label',eq);
  $('graph-title').textContent=`Grafik ${eq}`;
  const points=endpoints(m,c);
  $('line').setAttribute('d',points.length?`M ${X(points[0][0])} ${Y(points[0][1])} L ${X(points[1][0])} ${Y(points[1][1])}`:'');
  const intercept=$('intercept'); intercept.replaceChildren();
  if ($('show-intercept').checked) {
    intercept.append(element('circle',{cx:X(0),cy:Y(c),r:5.5,fill:'#bd602c',stroke:'white','stroke-width':2}));
    mathLabel(intercept,X(0)+15,Y(c)+(c>=9?12:-48),[['mo','('],['mn','0'],['mo',','],...signedNumber(c),['mo',')']],'#a04a21');
  }
  renderTriangle();
}
// MathML labels use the same equation typesetting as the parameter panel.
function mathLabel(group, x, y, tokens, color, anchor='start') {
  const width=210, height=44;
  let left=anchor==='middle'?x-width/2:anchor==='end'?x-width:x;
  left=Math.max(30,Math.min(690-width,left));
  const top=Math.max(22,Math.min(672-height,y));
  const box=element('foreignObject',{x:left,y:top,width,height,class:'math-label'});
  const wrapper=document.createElementNS('http://www.w3.org/1999/xhtml','div');
  wrapper.setAttribute('class','math-label-content');
  wrapper.style.color=color; wrapper.style.textAlign=anchor==='middle'?'center':anchor==='end'?'right':'left';
  const math=document.createElementNS('http://www.w3.org/1998/Math/MathML','math');
  for(const [tag,text] of tokens){const part=document.createElementNS(math.namespaceURI,tag);part.textContent=text;math.append(part);}
  wrapper.append(math);box.append(wrapper);group.append(box);
}
function signedNumber(value){return value<0?[['mo','\u2212'],['mn',fmt(Math.abs(value))]]:[['mn',fmt(value)]];}
function triangleRange(){
  const pts=endpoints(state.m,state.c);
  return [pts[0][0],pts[1][0]];
}
function triangleSize(value){
  const [low,high]=triangleRange();
  return Math.max(low,Math.min(high,value));
}
function renderTriangle(){
  const triangle=$('triangle'), labels=$('triangle-labels'), handle=$('triangle-handle');
  triangle.replaceChildren();labels.replaceChildren();
  const visible=$('show-triangle').checked;
  handle.setAttribute('display',visible?'inline':'none');
  if(!visible)return;
  let dx=triangleSize(state.triangleDx);
  if(Math.abs(dx)<0.1){const [low,high]=triangleRange();dx=triangleSize(high>=Math.abs(low)?3:-3);}
  state.triangleDx=dx;
  const {m,c}=state, dy=m*dx, x2=dx, y2=c+dy;
  triangle.append(element('path',{d:`M ${X(0)} ${Y(c)} L ${X(x2)} ${Y(c)} L ${X(x2)} ${Y(y2)} Z`,fill:'#2866df0c',stroke:'none'}));
  segment(triangle,0,c,x2,c,{stroke:'#3b927d','stroke-width':2,'stroke-dasharray':'6 4'});
  segment(triangle,x2,c,x2,y2,{stroke:'#bd602c','stroke-width':2,'stroke-dasharray':'6 4'});
  const below=(dy>=0&&c>-8)||(c>8);
  mathLabel(labels,X(dx/2),Y(c)+(below?9:-45),[['mo','\u0394'],['mi','x'],['mo','='],...signedNumber(dx)],'#297864','middle');
  // Place the vertical label away from the interior of the triangle.
  mathLabel(labels,X(dx)+(dx>=0?15:-15),Y((c+y2)/2)-23-(m===0?44:0),[['mo','\u0394'],['mi','y'],['mo','='],...signedNumber(dy)],'#a04a21',dx>=0?'start':'end');
  handle.setAttribute('transform',`translate(${X(x2)} ${Y(y2)})`);
  handle.setAttribute('aria-valuenow',fmt(dx));
  handle.setAttribute('aria-valuetext',`Delta x ${fmt(dx)}, Delta y ${fmt(dy)}`);
}
function initTriangleInteraction(){
  const graph=$('graph');
  graph.append(element('g',{id:'triangle-labels','pointer-events':'none'}));
  const handle=element('g',{id:'triangle-handle',class:'triangle-handle',role:'slider',tabindex:'0','aria-label':'Ukuran segitiga gradien. Seret titik pada garis atau gunakan tombol panah.','aria-valuemin':-10,'aria-valuemax':10});
  handle.append(element('title',{},'Seret untuk memperbesar atau memperkecil segitiga gradien'));
  handle.append(element('circle',{r:18,fill:'transparent','data-triangle-handle':'true'}));
  handle.append(element('circle',{r:8,fill:'#fff',stroke:'#2866df','stroke-width':2.5,'data-triangle-handle':'true'}));
  handle.append(element('circle',{r:3,fill:'#2866df','pointer-events':'none'}));
  graph.append(handle);
  let activePointer=null;
  graph.addEventListener('pointerdown',event=>{
    if(!event.target.closest('[data-triangle-handle]'))return;
    if(event.pointerType==='mouse'&&event.button!==0)return;
    event.preventDefault();activePointer=event.pointerId;
    graph.setPointerCapture(event.pointerId);handle.classList.add('dragging');handle.focus();
  });
  graph.addEventListener('pointermove',event=>{
    if(event.pointerId!==activePointer)return;
    const matrix=graph.getScreenCTM();if(!matrix)return;
    const pt=graph.createSVGPoint();pt.x=event.clientX;pt.y=event.clientY;
    const svgPt=pt.matrixTransform(matrix.inverse());
    const wx=(svgPt.x-350)/30.8, wy=(350-svgPt.y)/30.8;
    // Orthogonal projection keeps the endpoint on y = mx + c at every slope.
    const projected=(wx+state.m*(wy-state.c))/(1+state.m*state.m);
    const rounded=Math.round(projected*10)/10;
    state.triangleDx=triangleSize(Math.abs(rounded)<0.1?(projected<0?-0.1:0.1):rounded);
    renderTriangle();
  });
  const finish=event=>{
    if(event.pointerId!==activePointer)return;
    activePointer=null;handle.classList.remove('dragging');
    if(graph.hasPointerCapture(event.pointerId))graph.releasePointerCapture(event.pointerId);
  };
  graph.addEventListener('pointerup',finish);graph.addEventListener('pointercancel',finish);graph.addEventListener('lostpointercapture',finish);
  handle.addEventListener('keydown',event=>{
    const delta={ArrowRight:0.1,ArrowUp:0.1,ArrowLeft:-0.1,ArrowDown:-0.1,PageUp:1,PageDown:-1}[event.key];
    if(delta===undefined)return;
    event.preventDefault();let next=Math.round((state.triangleDx+delta)*10)/10;
    if(next===0)next=delta>0?0.1:-0.1;
    state.triangleDx=triangleSize(next);renderTriangle();
  });
}

function sync(key,value,source) {
  state[key]=value;
  // A number entry can use finer precision than the default 0.1 slider step.
  $(key+'-slider').step='any';
  $(key+'-slider').value=value;
  if(source!=='number') $(key+'-number').value=value;
  $(key+'-number').removeAttribute('aria-invalid');
  $(key+'-error').textContent='';
  render();
}
for(const key of ['m','c']) {
  const number=$(key+'-number'), slider=$(key+'-slider');
  slider.addEventListener('input',()=>sync(key,Math.round(Number(slider.value)*10)/10,'slider'));
  number.addEventListener('input',()=>{
    const value=number.valueAsNumber;
    if(!Number.isFinite(value)||value< -10||value>10) {
      number.setAttribute('aria-invalid','true');
      $(key+'-error').textContent='Masukkan angka dari −10 sampai 10.';
      return;
    }
    sync(key,value,'number');
  });
  number.addEventListener('blur',()=>{
    if(number.getAttribute('aria-invalid')==='true') sync(key,state[key],'reset');
  });
  number.addEventListener('keydown',event=>{if(event.key==='Enter')number.blur();});
  // Keyboard steps remain predictable even though the slider accepts precise input.
  slider.addEventListener('keydown',event=>{
    const delta={ArrowRight:0.1,ArrowUp:0.1,ArrowLeft:-0.1,ArrowDown:-0.1,PageUp:1,PageDown:-1}[event.key];
    if(delta!==undefined){event.preventDefault();sync(key,Math.max(-10,Math.min(10,Math.round((state[key]+delta)*10)/10)),'slider');}
  });
}
for(const id of ['show-intercept','show-triangle']) $(id).addEventListener('change',render);
$('reset').addEventListener('click',()=>{
  $('show-intercept').checked=true; $('show-triangle').checked=false;
  state.triangleDx=3;
  sync('m',0,'reset');sync('c',0,'reset');
});
initGrid();initTriangleInteraction();render();
