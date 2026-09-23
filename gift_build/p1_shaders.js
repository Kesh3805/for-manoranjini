// ============================================================ GLSL
const COMMON = `
precision highp float; precision highp int;
uniform float uTime;
uniform vec3 uCamR, uCamU, uCamF, uCamPos; uniform float uTan; uniform vec2 uRes;
uint hu(uint x){x^=x>>16u;x*=0x7feb352du;x^=x>>15u;x*=0x846ca68bu;x^=x>>16u;return x;}
float hf(uint x){return float(hu(x)>>8u)*(1./16777216.);}
float h13(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
vec3 h33(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.xxy+p.yxx)*p.zyx);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(h13(i),h13(i+vec3(1,0,0)),f.x),mix(h13(i+vec3(0,1,0)),h13(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h13(i+vec3(0,0,1)),h13(i+vec3(1,0,1)),f.x),mix(h13(i+vec3(0,1,1)),h13(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p,int o){float s=0.,a=.5,n=0.;for(int i=0;i<6;i++){if(i>=o)break;s+=a*n3(p);n+=a;p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s/n;}
vec3 bb(float T){float x=clamp(log2(T/1000.)/5.,0.,1.);
 vec3 a=vec3(1.,.28,.06),b=vec3(1.,.62,.32),c=vec3(1.,.93,.84),d=vec3(.78,.86,1.),e=vec3(.58,.7,1.);
 if(x<.25)return mix(a,b,x/.25); if(x<.45)return mix(b,c,(x-.25)/.2); if(x<.6)return mix(c,d,(x-.45)/.15); return mix(d,e,(x-.6)/.4);}
vec3 camRay(vec2 fc){vec2 s=fc/uRes*2.-1.;return normalize(uCamF+s.x*uTan*uCamR+s.y*uTan*uCamU);}
vec2 isph(vec3 ro,vec3 rd,vec3 c,float R){vec3 oc=ro-c;float b=dot(oc,rd);float cc=dot(oc,oc)-R*R;float h=b*b-cc;if(h<0.)return vec2(-1.);h=sqrt(h);return vec2(-b-h,-b+h);}
`;
const FSQ_VS = `#version 300 es
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}`;

// ------------------------------------------------------------ environment: two universes (cool void / warm ocean world)
const ENV_FS = `#version 300 es
${COMMON}
uniform float uWarm, uReveal, uNeb, uOcean, uDim; uniform vec3 uSun, uHero; uniform float uHeroI;
uniform vec4 uIsl[5];
out vec4 o;
vec3 starL(vec3 d,float S,float dens,float px,float seed,float br){
 vec3 g=d*S,id=floor(g),f=g-id; vec3 h=h33(id+seed);
 if(h.x>dens||h.z>uReveal)return vec3(0);
 vec3 sp=.25+.5*h33(id*1.7+seed+3.1); vec3 dd=f-sp; dd-=d*dot(dd,d);
 float r2=dot(dd,dd)/(S*S); float w=px*px*.55;
 float T=uWarm>.5?2600.+pow(h.y,1.5)*5000.:6000.+pow(h.y,.7)*22000.;
 float tw=.8+.2*sin(uTime*(1.5+h.z*4.)+h.x*50.);
 return bb(T)*(.1+pow(fract(h.y*7.3),9.)*25.)*exp(-r2/w)*tw*br;
}
vec3 skyCol(vec3 d,float px){
 vec3 c=vec3(0);
 c+=starL(d,60.,.3,px,1.,1.3)+starL(d,170.,.2,px,3.,.45)+starL(d,420.,.08,px,5.,.14);
 vec3 q=d*2.2+vec3(uTime*.004,0.,0.);
 float n=fbm(q+fbm(q*1.3,3)*1.4,5), n2=fbm(q*1.8+7.,4);
 vec3 nc=uWarm>.5?mix(vec3(1.,.55,.3),vec3(1.,.3,.45),n2):mix(vec3(.15,.25,.9),vec3(.5,.2,.85),n2);
 c+=nc*pow(n,3.2)*uNeb*.9;
 if(uWarm>.5){
  float hz=exp(-max(d.y,0.)*5.);
  c=c*smoothstep(-.05,.2,d.y)+mix(vec3(.025,.008,.04),vec3(.5,.2,.16),hz)*.32;
  float s=max(dot(d,uSun),0.); c+=vec3(1.,.62,.35)*(pow(s,300.)*6.+pow(s,12.)*.35+pow(s,3.)*.12);
 }
 return c*uDim;
}
float islSD(vec3 p){
 float d=1e9;
 for(int k=0;k<5;k++){vec4 I=uIsl[k]; vec3 q=p-I.xyz; float r=I.w;
  float e=(length(q/vec3(r,r*.95,r))-1.)*r*.8; e=max(e,q.y-r*.04);
  e+=(n3(p*1.6+float(k)*7.)-.5)*r*.28+(n3(p*5.)-.5)*.12;
  d=min(d,e);}
 return d;
}
vec3 islNorm(vec3 p){vec2 e=vec2(.02,0);return normalize(vec3(islSD(p+e.xyy)-islSD(p-e.xyy),islSD(p+e.yxy)-islSD(p-e.yxy),islSD(p+e.yyx)-islSD(p-e.yyx)));}
float caus(vec2 uv){
 vec2 p=mod(uv*6.2831,6.2831)-250.,i=p; float c=1.,inten=.005;
 for(int n=0;n<4;n++){float t=uTime*.35*(1.-(3.5/float(n+1)));i=p+vec2(cos(t-i.x)+sin(t+i.y),sin(t-i.y)+cos(t+i.x));
  c+=1./length(vec2(p.x/(sin(i.x+t)/inten),p.y/(cos(i.y+t)/inten)));}
 c/=4.; c=1.17-pow(c,1.4); return pow(abs(c),8.);
}
vec3 shadeIsl(vec3 p,vec3 rd){
 vec3 n=islNorm(p); float dl=max(dot(n,uSun),0.);
 float top=smoothstep(.45,.8,n.y);
 vec3 rock=mix(vec3(.2,.1,.09),vec3(.38,.2,.15),n3(p*3.));
 vec3 grass=mix(vec3(.16,.26,.07),vec3(.42,.38,.12),n3(p*4.));
 vec3 c=mix(rock,grass,top)*(dl*.8+.05)*vec3(1.,.8,.62);
 c+=vec3(.08,.3,.3)*max(-n.y,0.)*.6;
 vec3 L=uHero-p; float dh=dot(L,L); c+=mix(rock,grass,top)*max(dot(n,normalize(L)),0.)*uHeroI*2./(1.+dh*.2);
 vec3 fid=floor(p*16.); float fl=step(.93,h13(fid))*top;
 c+=mix(vec3(1.,.45,.6),vec3(1.,.85,.4),h13(fid+2.))*fl*(1.5+sin(uTime*2.+h13(fid)*30.));
 float rim=pow(1.-max(dot(n,-rd),0.),3.); c+=vec3(1.,.6,.4)*rim*.25;
 return c;
}
void main(){
 vec3 rd=camRay(gl_FragCoord.xy); float px=2.*uTan/uRes.y; vec3 ro=uCamPos;
 vec3 col=skyCol(rd,px);
 if(uOcean>0.){
  float tO=rd.y<0.?-ro.y/rd.y:1e9;
  float tI=1e9;
  for(int k=0;k<5;k++){vec2 h=isph(ro,rd,uIsl[k].xyz,uIsl[k].w*1.35); if(h.y>0.){
   float t=max(h.x,0.); for(int i=0;i<56;i++){float d=islSD(ro+rd*t); if(d<.01){tI=min(tI,t);break;} t+=d*.9; if(t>h.y)break;}}}
  if(tI<tO){ vec3 p=ro+rd*tI; vec3 c=shadeIsl(p,rd); float fog=1.-exp(-tI*.01); col=mix(c*uDim,vec3(.5,.2,.16)*.32*uDim,fog); }
  else if(tO<1e8){
   vec3 p=ro+rd*tO; vec2 w=p.xz;
   float hx=cos(w.x*.8+uTime*.9)*.12+cos(w.x*1.9+w.y*.7+uTime*1.4)*.05+cos(w.y*1.3-uTime*1.1)*.08;
   float hz=cos(w.y*.9+uTime*.7)*.1+cos(w.x*.6+w.y*1.7-uTime*1.3)*.06;
   vec3 n=normalize(vec3(-hx,1.,-hz)+ (vec3(n3(vec3(w*3.,uTime*.3)),0.,n3(vec3(w*3.+9.,uTime*.3)))-.5)*.15);
   vec3 rf=reflect(rd,n); float fr=.04+.96*pow(1.-max(dot(n,-rd),0.),5.);
   vec3 refl=skyCol(rf,px*2.);
   float cs=caus(w*.12)+caus(w*.31+3.)*.6;
   vec3 glow=mix(vec3(.1,.8,.75),vec3(1.,.7,.3),n3(vec3(w*.08,1.)))*cs*.35;
   vec3 L=uHero-p; float dh=length(L); vec3 hl=L/dh; float sp=pow(max(dot(rf,hl),0.),60.)*uHeroI*6./(1.+dh*.05);
   vec3 c=refl*fr*.6+glow*(1.-fr)*1.6+vec3(.004,.012,.02)+vec3(1.,.85,.6)*sp;
   float fog=1.-exp(-tO*.012); col=mix(c*uDim,vec3(.5,.2,.16)*.32*uDim,fog)*uOcean+col*(1.-uOcean);
  }
 }
 o=vec4(col,1.);
}`;

// ------------------------------------------------------------ planets: accreting rock worlds and a world of glowing flowers
const BODY_FS = `#version 300 es
${COMMON}
uniform int uNB; uniform vec4 uBP[4]; uniform vec4 uBT[4]; uniform vec3 uHero; uniform float uHeroI;
out vec4 o;
vec3 tb(vec3 n,out vec3 t2){vec3 t1=normalize(cross(n,abs(n.y)<.9?vec3(0,1,0):vec3(1,0,0)));t2=cross(n,t1);return t1;}
vec3 flowers(vec3 n,float bloom){
 vec3 e=vec3(0);
 for(int L=0;L<2;L++){ float F=L==0?13.:30.;
  vec3 g=n*F,id=floor(g),f=g-id; vec3 hh=h33(id+float(L)*9.);
  if(hh.z>.72)continue;
  vec3 dd=f-(.3+.4*h33(id+3.)); dd-=n*dot(dd,n); float rr=length(dd);
  vec3 t2; vec3 t1=tb(n,t2); float ang=atan(dot(dd,t2),dot(dd,t1));
  float k=5.+floor(hh.x*3.);
  float pr=(.14+.14*hh.y)*bloom*(.5+.5*abs(cos(k*.5*ang+hh.x*6.)));
  float pet=smoothstep(pr,pr*.75,rr)*smoothstep(0.,.02,pr);
  float core=smoothstep(.045,.02,rr)*bloom;
  vec3 pc=hh.x<.3?vec3(.2,.9,1.):hh.x<.55?vec3(1.,.3,.8):hh.x<.8?vec3(.6,.4,1.):vec3(1.,.85,.5);
  float br=.6+.4*sin(uTime*1.4+hh.y*30.);
  e+=pc*pet*mix(.35,1.,rr/max(pr,1e-3))*br*1.4+vec3(1.,.95,.8)*core*1.8;
 }
 return e;
}
void main(){
 vec3 rd=camRay(gl_FragCoord.xy); float px=2.*uTan/uRes.y; vec3 ro=uCamPos;
 float tb_=1e30; int kb=-1;
 for(int k=0;k<4;k++){ if(k>=uNB)break; vec2 h=isph(ro,rd,uBP[k].xyz,uBP[k].w); if(h.x>0.&&h.x<tb_){tb_=h.x;kb=k;} }
 if(kb<0){o=vec4(0);return;}
 vec3 c=uBP[kb].xyz; float R=uBP[kb].w; vec3 hp=ro+rd*tb_; vec3 n=normalize(hp-c);
 float tc=dot(c-ro,rd); float dcl=length(c-ro-rd*tc); float cov=clamp((R-dcl)/(px*tb_)+.5,0.,1.);
 vec3 L=uHero-hp; float dh=dot(L,L); float lit=max(dot(n,normalize(L)),0.)*uHeroI*3./(1.+dh*.08)+max(dot(n,normalize(vec3(-.4,.6,.5))),0.)*.05;
 vec3 col;
 if(uBT[kb].x<.5){ float f=fbm(n*4.+uBT[kb].y,5); col=mix(vec3(.25,.3,.42),vec3(.55,.6,.7),f)*lit+vec3(.3,.5,1.)*pow(1.-max(dot(n,-rd),0.),3.)*.15;}
 else { vec3 g=mix(vec3(.02,.05,.07),vec3(.05,.1,.1),fbm(n*6.+uBT[kb].y,4)); col=g*(lit*2.+.15)+flowers(n,uBT[kb].z);
  col+=vec3(.2,.6,1.)*pow(1.-max(dot(n,-rd),0.),4.)*.4; }
 o=vec4(col*cov,cov);
}`;

// ------------------------------------------------------------ one GPU particle program; every position is a pure function of (id, time)
const PART_VS = `#version 300 es
${COMMON}
uniform int uMode; uniform uint uSeed;
uniform vec4 uP0,uP1,uP2; uniform float uBright,uRef,uPxMin,uMaxPx,uNear;
uniform sampler2D uPath; uniform float uPathT;
uniform vec4 uIsl[5];
uniform sampler2D uSA,uSB; uniform mat3 uRA,uRB; uniform vec3 uOA,uOB; uniform float uMix,uStag,uChaos,uSwirl,uAlpha;
out vec3 vCol; flat out float vShape; out float vPh; out vec2 vDir;
uint bid;
float R(uint k){return hf(bid+k*0x9E3779B9u);}
float gs(uint k){return sqrt(-2.*log(max(R(k),1e-7)))*cos(6.2831853*R(k+1u));}
vec3 g3(uint k){return vec3(gs(k),gs(k+2u),gs(k+4u));}
vec3 sph(float a,float b){float z=2.*a-1.,r=sqrt(max(0.,1.-z*z)),p=6.2831853*b;return vec3(r*cos(p),z,r*sin(p));}
void bas(vec3 n,out vec3 e1,out vec3 e2){e1=normalize(cross(n,abs(n.y)<.95?vec3(0,1,0):vec3(1,0,0)));e2=cross(n,e1);}
vec3 pathAt(float s){float x=clamp(s/uPathT,0.,1.)*255.;int i=int(floor(x));int j=min(i+1,255);
 return mix(texelFetch(uPath,ivec2(i,0),0).xyz,texelFetch(uPath,ivec2(j,0),0).xyz,x-float(i));}
void main(){
 bid=hu(uint(gl_VertexID)*0x27d4eb2du^(uSeed*0x165667b1u));
 vec3 p=vec3(0),col=vec3(1); float lum=1.,size=0.,shape=0.; float t=uTime; vPh=0.; vDir=vec2(1,0);
 if(uMode==0){ // matter born in the wake of the particle; its path seeds the field
  float ts=mix(3.,64.,R(1u)); float age=t-ts;
  if(age<0.)lum=0.; else {
   vec3 b=pathAt(ts); float sc=mix(.3,5.,smoothstep(4.,58.,ts));
   vec3 fld=vec3(sin(b.z*.7+b.y*1.3),cos(b.x*.9+b.z*.31),sin(b.y*1.1-b.x*.5+b.z*.2));
   vec3 d=normalize(g3(2u)+fld*.9); float k=R(8u); float grow=1.-exp(-age/2.5);
   if(k<.8){ p=b+d*sc*(.12+2.2*pow(R(9u),1.5))*grow;
    col=bb(R(11u)<.12?4200.:mix(8000.,26000.,R(10u))); lum=(.3+pow(R(12u),8.)*12.)*(1.+5.*exp(-age*2.5));
   } else if(k<.9){ p=b+d*sc*(.3+1.7*R(9u))*grow; size=sc*(.25+.6*R(10u))*grow;
    col=R(12u)<.3?vec3(.2,.75,.95):mix(vec3(.25,.35,1.),vec3(.6,.3,1.),R(11u)); lum=.5*grow;
   } else { float sy=floor(R(9u)*14.); float tss=mix(8.,58.,h13(vec3(sy,1.,2.)));
    if(t<tss)lum=0.; else { float s2=smoothstep(8.,58.,tss);
     vec3 c=pathAt(tss)+(h33(vec3(sy,3.,4.))-.5)*vec3(8.,3.,8.)*(.3+s2);
     vec3 ax=normalize(h33(vec3(sy,5.,6.))-.5+vec3(0,.8,0)),e1,e2; bas(ax,e1,e2);
     float orb=floor(R(10u)*4.)+1.; float rr=orb*.3*(1.+s2*1.5); float th=R(11u)*6.2831853+t*.5/orb;
     float on=smoothstep(tss,tss+3.,t);
     if(R(12u)<.03){p=c;lum=5.*on;col=bb(5500.);}
     else if(R(13u)<.04){th=h13(vec3(sy,orb,9.))*6.2831853+t*.5/orb;p=c+(e1*cos(th)+e2*sin(th))*rr;lum=1.5*on;col=vec3(.7,.85,1.);}
     else {p=c+(e1*cos(th)+e2*sin(th))*rr;col=vec3(.5,.65,1.);lum=.1*on;} } }
  }
 } else if(uMode==1){ // spiral galaxies condensing out of chaotic clouds
  float f=smoothstep(uP0.w,uP0.w+12.,t);
  vec3 n=normalize(uP1.xyz),e1,e2; bas(n,e1,e2);
  float r=min(-log(1.-R(1u)*.985)*.28,1.2); float arms=uP2.x; float k=floor(R(2u)*arms);
  float th=k*6.2831853/arms+2.6*log(max(r,.02))+gs(3u)*mix(.9,.25,step(R(5u),.7))+t*uP2.y/(r+.1);
  if(R(6u)<.12){r=.2*pow(R(7u),2.);th=R(8u)*6.2831853;}
  vec3 sp=(e1*cos(th)+e2*sin(th))*r+n*gs(9u)*.02*(1.+r);
  vec3 cl=sph(R(11u),R(12u))*pow(R(13u),.33)*1.3+vec3(sin(t*.2+R(14u)*6.),0.,cos(t*.17+R(15u)*6.))*.2;
  p=uP0.xyz+mix(cl,sp,f)*uP1.w;
  col=r<.2?bb(4500.):bb(mix(7000.,24000.,R(16u))); lum=(.4+pow(R(17u),8.)*6.)*smoothstep(uP0.w-3.,uP0.w+4.,t);
 } else if(uMode==2){ // dust accreting into a planet
  float f=smoothstep(uP0.w,uP0.w+9.,t); vec3 ax=normalize(vec3(.2,1.,.1)),e1,e2; bas(ax,e1,e2);
  float r=mix(uP1.x*(1.8+R(1u)*5.),uP1.x,pow(f,.7)); float th=R(2u)*6.2831853+t*1.2*uP1.x/r;
  p=uP0.xyz+(e1*cos(th)+e2*sin(th))*r+ax*gs(3u)*.25*r*(1.-f);
  col=mix(vec3(.6,.75,1.),vec3(1.,.8,.6),R(5u)); lum=.8*smoothstep(0.,.05,f)*(1.-smoothstep(.8,1.,f)); size=.02;
 } else if(uMode==3){ // tiny glowing creatures that follow the particle
  float lag=.25+R(1u)*2.6; vec3 b=pathAt(t-lag);
  float a=t*(.8+R(2u)*1.6)+R(3u)*6.2831853; float rad=.12+R(4u)*.6*(lag/2.8+.3);
  vec3 ax=sph(R(5u),R(6u)),e1,e2; bas(ax,e1,e2);
  p=b+(e1*cos(a)+e2*sin(a))*rad+vec3(sin(t*1.7+R(7u)*9.),cos(t*1.3+R(8u)*9.),sin(t*1.1+R(9u)*9.))*.12;
  col=mix(vec3(.35,1.,.75),vec3(.55,.7,1.),R(10u)); lum=(.6+.4*sin(t*6.+R(11u)*30.))*uP0.x*2.; shape=3.; size=.004;
 } else if(uMode==4){ // accretion disk of the black hole
  vec3 n=normalize(uP1.xyz),e1,e2; bas(n,e1,e2); float rs=uP1.w;
  float r=rs*mix(1.8,7.,pow(R(1u),1.3)); if(R(6u)<.2)r=rs*mix(7.,1.6,fract(R(7u)+t*.25));
  float th=R(2u)*6.2831853+2.2*pow(r/rs,-1.5)*t;
  p=uP0.xyz+(e1*cos(th)+e2*sin(th))*r+n*gs(3u)*.025*r;
  col=bb(mix(3500.,22000.,pow(1.8*rs/r,1.2))); lum=1.2*pow(1.8*rs/r,1.4)*uP0.w;
 } else if(uMode==5){ // butterflies circling the floating islands
  int k=gl_VertexID%5; vec4 I=uIsl[k];
  float a=t*(.25+R(1u)*.35)*(R(2u)<.5?1.:-1.)+R(3u)*6.2831853; float rr=I.w*(.7+R(4u)*1.3);
  p=I.xyz+vec3(cos(a)*rr,.6+R(5u)*2.2+sin(t*1.3+R(6u)*6.)*.35,sin(a)*rr);
  float c=R(7u); col=c<.3?vec3(1.,.7,.3):c<.55?vec3(1.,.4,.6):c<.8?vec3(.8,.6,1.):vec3(.6,1.,.95);
  size=.1+.06*R(8u); shape=2.; vPh=t*(8.+R(9u)*5.)+R(10u)*6.2831853; lum=1.4*uP0.x;
 } else if(uMode==6){ // shooting stars
  float ph=fract(t*.07*(1.+R(1u))+R(2u));
  vec3 st=vec3((R(3u)-.5)*140.,26.+R(4u)*30.,50.+R(5u)*90.); vec3 dir=normalize(vec3(R(6u)-.5,-.3,(R(7u)-.5)*.6));
  p=st+dir*ph*45.; lum=smoothstep(0.,.08,ph)*smoothstep(.45,.25,ph)*4.*uP0.x; shape=4.; col=vec3(1.,.9,.75);
  vec3 w2=p+dir-uCamPos, w1=p-uCamPos;
  vec2 s1=vec2(dot(w1,uCamR),dot(w1,uCamU))/dot(w1,uCamF), s2=vec2(dot(w2,uCamR),dot(w2,uCamU))/dot(w2,uCamF);
  vDir=normalize(s2-s1+1e-6);
 } else { // the story particles: one set of points morphing between precomputed target shapes
  ivec2 tc=ivec2(gl_VertexID%256,gl_VertexID/256);
  vec4 a=texelFetch(uSA,tc,0),b=texelFetch(uSB,tc,0); float h=R(1u);
  float m=clamp(uMix*(1.+uStag)-h*uStag,0.,1.); m=m*m*(3.-2.*m);
  vec3 pa=uOA+uRA*a.xyz,pb=uOB+uRB*b.xyz;
  p=mix(pa,pb,m)+g3(2u)*sin(3.14159*m)*uSwirl;
  p+=vec3(sin(t*.9+h*40.),cos(t*.7+h*23.),sin(t*.8+h*31.))*uChaos*(.3+R(8u));
  float w=mix(a.w,b.w,m);
  col=mix(mix(vec3(1.,.75,.42),vec3(1.,.45,.55),R(9u)),vec3(1.,.93,.82),clamp(w-.6,0.,1.));
  lum=uAlpha*w*(.8+.2*sin(t*3.+h*50.))*(1.+sin(3.14159*m)*.6);
  shape=w>1.6?1.:0.;
 }
 vec3 w=p-uCamPos; float vz=dot(w,uCamF);
 if(vz<uNear||lum<=0.){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=0.;return;}
 float vx=dot(w,uCamR),vy=dot(w,uCamU);
 if(abs(vx)>vz*uTan*1.15||abs(vy)>vz*uTan*1.15){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=0.;return;}
 gl_Position=vec4(vx/uTan,vy/uTan,0.,vz);
 float pxs=size/(vz*uTan)*uRes.y*.5; float mn=shape==4.?uPxMin*22.:shape==1.?uPxMin*2.5:uPxMin; float ps=clamp(max(pxs,mn),mn,uMaxPx);
 float I=lum*uBright*uRef*uRef/(vz*vz+uRef*uRef);
 vCol=col*I*(shape==2.||shape==4.?1.:(mn*mn)/(ps*ps)); gl_PointSize=ps; vShape=shape;
}`;
const PART_FS = `#version 300 es
precision highp float;
in vec3 vCol; flat in float vShape; in float vPh; in vec2 vDir; out vec4 o;
void main(){vec2 q=gl_PointCoord*2.-1.;q.y=-q.y;float r2=dot(q,q);float a;
 if(vShape<.5)a=exp(-r2*4.);
 else if(vShape<1.5)a=exp(-r2*16.)+.25*exp(-abs(q.x)*20.-abs(q.y)*3.)+.25*exp(-abs(q.y)*20.-abs(q.x)*3.);
 else if(vShape<2.5){ float f=.2+.8*abs(sin(vPh)); vec2 u=vec2(abs(q.x)/f,q.y);
  float up=length((u-vec2(.42,.22))/vec2(.46,.4)),lo=length((u-vec2(.32,-.3))/vec2(.3,.28));
  float wing=smoothstep(1.,.8,min(up,lo)); float body=smoothstep(.06,.02,abs(q.x))*step(abs(q.y),.45);
  a=wing*(.35+.65*smoothstep(.2,1.,min(up,lo)))+body*.8; }
 else if(vShape<3.5)a=exp(-r2*6.)*.6+exp(-r2*45.)*2.;
 else { vec2 d=-vDir; float al=dot(q,d); vec2 pp=q-d*al; a=exp(-r2*90.)*2.+step(0.,al)*exp(-dot(pp,pp)*500.)*pow(max(1.-al,0.),2.); }
 if(a<.002)discard; o=vec4(vCol*a,0.);}`;

// ------------------------------------------------------------ glare sprites (the particle itself, the final star)
const SPR_VS = `#version 300 es
${COMMON}
layout(location=0) in vec4 aP; layout(location=1) in vec4 aC; layout(location=2) in vec4 aX;
out vec2 vP; out float vCore,vHalf; out vec4 vC; out vec2 vX;
void main(){int id=gl_VertexID;vec2 c=vec2((id==1||id==2||id==4)?1.:-1.,(id==2||id==4||id==5)?1.:-1.);
 vec3 w=aP.xyz-uCamPos;float vz=dot(w,uCamF);if(vz<.01){gl_Position=vec4(2,2,2,1);return;}
 vec2 ndc=vec2(dot(w,uCamR),dot(w,uCamU))/(vz*uTan);
 float core=max(aP.w/(vz*uTan)*uRes.y*.5,1.2);
 float hs=core*3.+clamp(sqrt(aC.w)*14.*aX.y,0.,uRes.y*.6);
 vP=c*hs;vCore=core;vHalf=hs;vC=aC;vX=aX.xy;gl_Position=vec4(ndc+c*hs/(uRes*.5),0.,1.);}`;
const SPR_FS = `#version 300 es
precision highp float;
in vec2 vP; in float vCore,vHalf; in vec4 vC; in vec2 vX; out vec4 o;
void main(){float r=length(vP),c=vCore;float core=exp(-r*r/(c*c));float halo=c*c/(c*c+r*r*.15)*.08*vX.y;
 float sp=0.;if(vX.x>0.){vec2 a=abs(vP);sp=(exp(-a.y/(1.+c*.15))*exp(-a.x/(vHalf*.35))+exp(-a.x/(1.+c*.15))*exp(-a.y/(vHalf*.35)))*.25*vX.x;}
 o=vec4(vC.rgb*vC.w*(core+halo+sp)*smoothstep(vHalf,vHalf*.6,r),0.);}`;

// ------------------------------------------------------------ post: bloom pyramid, fake lensing, white-out, two colour grades
const DOWN_FS = `#version 300 es
precision highp float; uniform sampler2D uT; uniform vec2 uInv,uSrc; out vec4 o;
void main(){vec2 uv=gl_FragCoord.xy*uInv;vec2 d=uSrc;
 vec3 c=texture(uT,uv+vec2(-d.x,-d.y)).rgb+texture(uT,uv+vec2(d.x,-d.y)).rgb+texture(uT,uv+vec2(-d.x,d.y)).rgb+texture(uT,uv+d).rgb;
 o=vec4(min(c*.25,vec3(6e4)),1.);}`;
const UP_FS = `#version 300 es
precision highp float; uniform sampler2D uT,uLow; uniform vec2 uInv,uSrc; out vec4 o;
void main(){vec2 uv=gl_FragCoord.xy*uInv;vec2 d=uSrc;
 vec3 b=texture(uLow,uv).rgb*4.+(texture(uLow,uv+vec2(d.x,0)).rgb+texture(uLow,uv-vec2(d.x,0)).rgb+texture(uLow,uv+vec2(0,d.y)).rgb+texture(uLow,uv-vec2(0,d.y)).rgb)*2.
  +texture(uLow,uv+d).rgb+texture(uLow,uv-d).rgb+texture(uLow,uv+vec2(d.x,-d.y)).rgb+texture(uLow,uv+vec2(-d.x,d.y)).rgb;
 o=vec4(texture(uT,uv).rgb+b/16.,1.);}`;
const FINAL_FS = `#version 300 es
precision highp float;
uniform sampler2D uImg,uBloom; uniform vec2 uRes; uniform float uExp,uBloomAmt,uFade,uWhite,uWarm,uTime; uniform vec4 uBH;
out vec4 o;
float h(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec2 uv=gl_FragCoord.xy/uRes; vec2 su=uv; float hole=1.,ring=0.;
 if(uBH.w>0.){vec2 d=uv-uBH.xy; float r=max(length(d),1e-4); float rh=uBH.z, te=rh*1.6;
  float beta=r-te*te/r; su=mix(uv,uBH.xy+d/r*abs(beta)*sign(beta+1e-6),uBH.w);
  hole=mix(1.,smoothstep(rh*.92,rh*1.04,r),uBH.w); ring=exp(-pow((r-rh*1.1)/(rh*.06+.002),2.))*uBH.w;}
 vec3 c=texture(uImg,su).rgb+texture(uBloom,su).rgb*uBloomAmt;
 c=c*hole+vec3(1.,.78,.5)*ring*1.4;
 c*=uExp; c=c*(1.+uWhite*10.)+vec3(1.,.97,.92)*uWhite*3.;
 c=mix(c*vec3(.86,.97,1.14),c*vec3(1.14,.98,.8),uWarm);
 c=aces(c); c=pow(c,vec3(1./2.2));
 c+=mix(vec3(0.,.006,.016),vec3(.018,.006,.004),uWarm)*(1.-c);
 vec2 d=uv-.5; c*=mix(.6,1.,smoothstep(1.35,.35,length(d*2.)));
 c+=(h(gl_FragCoord.xy+fract(uTime*7.)*391.)-.5)*.012;
 o=vec4(max(c,0.)*uFade,1.);}`;
