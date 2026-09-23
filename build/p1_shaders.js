// ============================================================ GLSL
const COMMON = `
precision highp float; precision highp int;
uniform float uTime;
uniform vec3 uCamR, uCamU, uCamF; uniform float uTan; uniform vec2 uRes;
uint hu(uint x){x^=x>>16u;x*=0x7feb352du;x^=x>>15u;x*=0x846ca68bu;x^=x>>16u;return x;}
float hf(uint x){return float(hu(x)>>8u)*(1./16777216.);}
float h13(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
vec3 h33(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.xxy+p.yxx)*p.zyx);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(h13(i),h13(i+vec3(1,0,0)),f.x),mix(h13(i+vec3(0,1,0)),h13(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h13(i+vec3(0,0,1)),h13(i+vec3(1,0,1)),f.x),mix(h13(i+vec3(0,1,1)),h13(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p,int o){float s=0.,a=.5,n=0.;for(int i=0;i<7;i++){if(i>=o)break;s+=a*n3(p);n+=a;p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s/n;}
vec3 bb(float T){float x=clamp(log2(T/1000.)/5.,0.,1.);
 vec3 a=vec3(1.,.28,.06),b=vec3(1.,.62,.32),c=vec3(1.,.93,.84),d=vec3(.78,.86,1.),e=vec3(.58,.7,1.);
 if(x<.25)return mix(a,b,x/.25); if(x<.45)return mix(b,c,(x-.25)/.2); if(x<.6)return mix(c,d,(x-.45)/.15); return mix(d,e,(x-.6)/.4);}
vec3 camRay(vec2 fc){vec2 s=(fc*2.-uRes)/uRes.y;return normalize(uCamF+s.x*uTan*uCamR+s.y*uTan*uCamU);}
vec2 isph(vec3 ro,vec3 rd,vec3 c,float R){vec3 oc=ro-c;float b=dot(oc,rd);float cc=dot(oc,oc)-R*R;float h=b*b-cc;if(h<0.)return vec2(-1.);h=sqrt(h);return vec2(-b-h,-b+h);}
`;

const FSQ_VS = `#version 300 es
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}`;

// ------------------------------------------------------------ procedural sky (shared by sky + black hole)
const SKYLIB = `
uniform vec4 uSkyA; // stars, galactic band, distant galaxies, haze
uniform vec4 uSkyB; // star reveal, cmb, -, -
uniform mat3 uSkyRot;
uniform vec4 uGRB;   // dir, intensity
uniform vec4 uRip; uniform float uRipR; // spacetime ripple: centre dir, amplitude / angular radius
uniform vec4 uLensGal; // distant galaxy to be lensed: dir, brightness
vec3 rippleDir(vec3 d){
 if(uRip.w<=0.)return d;
 float ang=acos(clamp(dot(d,uRip.xyz),-1.,1.)); float x=ang-uRipR;
 float w=exp(-x*x*18.)*sin(x*26.)*uRip.w;
 vec3 t=d-uRip.xyz*dot(d,uRip.xyz); t/=max(length(t),1e-5);
 return normalize(d+t*w*.06);
}
vec3 starL(vec3 d,float S,float dens,float px,float seed,float br){
 vec3 g=d*S,id=floor(g),f=g-id; vec3 h=h33(id+seed);
 if(h.x>dens||h.z>uSkyB.x)return vec3(0);
 vec3 sp=.25+.5*h33(id*1.7+seed+3.1); vec3 dd=f-sp; dd-=d*dot(dd,d);
 float r2=dot(dd,dd)/(S*S); float w=px*px*.55;
 float L=.08+pow(h.y,9.)*30.;
 float T=2700.+pow(fract(h.y*13.7+h.z*7.1),2.2)*24000.;
 float tw=.85+.15*sin(uTime*(2.+h.z*5.)+h.x*50.);
 return bb(T)*L*exp(-r2/w)*tw*br;
}
vec3 sky(vec3 d0,float px){
 vec3 d=rippleDir(d0); vec3 q=uSkyRot*d; vec3 col=vec3(0);
 col+=(vec3(.004,.0035,.006)+vec3(.02,.012,.01)*(fbm(d*5.,3)-.4))*uSkyB.y;
 if(uSkyA.y>0.){
  float b=q.y, band=exp(-b*b*28.); vec3 cq=q-vec3(1,0,0); float core=exp(-dot(cq,cq)*2.2);
  float n=fbm(q*6.,5); float dust=smoothstep(.45,.72,fbm(q*11.+4.,5))*exp(-b*b*260.);
  vec3 bc=mix(vec3(.5,.6,.9),vec3(1.,.76,.48),core);
  col+=bc*(band*(.2+.9*n)+core*exp(-b*b*70.))*(1.-dust*.92)*uSkyA.y*.1;
 }
 if(uSkyA.w>0.){float n=fbm(q*2.5+9.,4);col+=mix(vec3(.25,.05,.2),vec3(.03,.15,.22),fbm(q*1.5,3))*n*n*n*uSkyA.w*.5;}
 if(uSkyA.x>0.){
  float bandB=1.+uSkyA.y*1.5*exp(-q.y*q.y*25.);
  col+=starL(d,60.,.35,px,1.,1.4)*uSkyA.x;
  col+=starL(d,170.,.22,px,3.,.45)*uSkyA.x;
  col+=starL(d,430.,min(.06*bandB*bandB,.5),px,5.,.14)*uSkyA.x;
 }
 if(uSkyA.z>0.){vec3 g=d*22.,id=floor(g),f=g-id;vec3 h=h33(id+11.);
  if(h.x<.3){vec3 c=.3+.4*h33(id+2.);vec3 dd=f-c;dd-=d*dot(dd,d);
   vec3 ax=normalize(cross(d,h33(id+5.)-.5));float u=dot(dd,ax),v=length(dd-ax*u);float sz=.012+.035*pow(h.y,3.);
   col+=mix(vec3(1.,.8,.6),vec3(.7,.8,1.),h.z)*exp(-(u*u+v*v/.12)/(sz*sz))*uSkyA.z*(.2+h.y)*.5;}}
 if(uLensGal.w>0.){vec3 L=uLensGal.xyz;float cd=dot(d,L);
  if(cd>0.){vec3 t1=normalize(cross(L,vec3(0,1,.001))),t2=cross(L,t1);vec2 uv=vec2(dot(d,t1),dot(d,t2))/.06;uv.y/=.6;
   float r=length(uv),th=atan(uv.y,uv.x);float arms=.5+.5*cos(2.*th-5.*log(r+.02));
   float I=exp(-r*2.6)*(.3+.9*arms*smoothstep(.05,.3,r))+exp(-r*r*50.)*1.5;
   col+=mix(vec3(.7,.8,1.),vec3(1.,.85,.6),exp(-r*3.))*I*uLensGal.w;}}
 if(uGRB.w>0.){float a=acos(clamp(dot(d,uGRB.xyz),-1.,1.));
  col+=vec3(.8,.9,1.)*uGRB.w*(exp(-a*a*6000.)*30.+exp(-a*a*80.)*.6+exp(-a*6.)*.1);}
 return col;
}`;

const SKY_FS = `#version 300 es
${COMMON}${SKYLIB}
out vec4 o;
void main(){o=vec4(sky(camRay(gl_FragCoord.xy),2.*uTan/uRes.y),1.);}`;

// ------------------------------------------------------------ black holes: photon geodesics + accretion disks
const BH_FS = `#version 300 es
${COMMON}${SKYLIB}
uniform vec4 uBH[2]; uniform vec4 uDN[2]; uniform vec4 uDP; uniform float uHaze;
out vec4 o;
vec4 disk(vec3 hp,vec3 c,float rs,vec3 n,float rout,vec3 vel,float seed){
 vec3 rel=(hp-c)/rs; float r=length(rel); float rin=uDP.x;
 if(r<rin||r>rout)return vec4(0);
 vec3 t1=normalize(cross(n,abs(n.y)<.9?vec3(0,1,0):vec3(1,0,0))),t2=cross(n,t1);
 float ph=atan(dot(rel,t2),dot(rel,t1)); float a=ph-uDP.z*pow(r,-1.5)*uTime;
 vec3 np=vec3(cos(a)*r*1.3,sin(a)*r*1.3,r*.7+seed);
 float den=smoothstep(.3,.8,fbm(np*1.4,4)); float streak=.55+.45*sin(r*9.+den*6.);
 float edge=smoothstep(rin,rin*1.3,r)*smoothstep(rout,rout*.55,r);
 float T=uDP.w*pow(r/rin,-.75);
 vec3 vd=normalize(cross(n,rel)); float beta=min(sqrt(.5/r),.7);
 float D=sqrt(1.-beta*beta)/(1.-beta*dot(vd,-vel)); float Df=D*sqrt(max(1.-1./r,.02));
 vec3 e=bb(T*Df)*pow(Df,3.)*den*streak*edge*uDP.y*(1.6*pow(rin/r,1.3)+.08);
 return vec4(e,clamp(den*edge*1.2,0.,.93));
}
void main(){
 vec3 rd=camRay(gl_FragCoord.xy); float px=2.*uTan/uRes.y;
 vec3 pos=vec3(0),vel=rd,col=vec3(0); float Tr=1.; bool cap=false;
 float rsM=max(uBH[0].w,uBH[1].w);
 for(int i=0;i<130;i++){
  vec3 acc=vec3(0); float dn=1e20, rn=rsM, hz=0.;
  for(int k=0;k<2;k++){ float rs=uBH[k].w; if(rs<=0.)continue;
   vec3 r=pos-uBH[k].xyz; float d=length(r); if(d<rs)cap=true;
   vec3 h=cross(r,vel); acc-=1.5*rs*dot(h,h)*r/(d*d*d*d*d);
   if(d<dn){dn=d;rn=rs;} hz+=exp(-d/(rs*4.))/rs; }
  if(cap)break;
  float dt=max(dn*.07,rn*.025);
  vec3 pp=pos; vel=normalize(vel+acc*dt); pos+=vel*dt;
  col+=Tr*vec3(1.,.5,.22)*uHaze*hz*dt*.02;
  for(int k=0;k<2;k++){ float rs=uBH[k].w; if(rs<=0.||uDN[k].w<=uDP.x)continue;
   vec3 n=uDN[k].xyz,c=uBH[k].xyz; float s0=dot(pp-c,n),s1=dot(pos-c,n);
   if(s0*s1<0.){vec3 hp=pp+(pos-pp)*(s0/(s0-s1)); vec4 e=disk(hp,c,rs,n,uDN[k].w,vel,float(k)*7.);
    col+=Tr*e.rgb; Tr*=1.-e.a;} }
  if(Tr<.01||dn>rsM*350.)break;
 }
 if(!cap)col+=Tr*sky(vel,px);
 o=vec4(col,1.);
}`;

// ------------------------------------------------------------ analytic bodies: stars, planets, moons, pulsars, a city world
const BODY_FS = `#version 300 es
${COMMON}
uniform int uNB; uniform vec4 uBP[6]; uniform vec4 uBT[6]; uniform vec4 uBX[6];
uniform vec3 uLPos; uniform vec3 uLCol;
out vec4 o;
vec3 rocky(vec3 n,vec3 L,float seed,bool moon){
 float f=fbm(n*4.+seed,5); vec3 alb;
 if(moon){vec3 g=n*6.;vec3 id=floor(g),fr=fract(g)-.5;vec3 cc=(h33(id+seed)-.5)*.4;float d=length(fr-cc),rad=.12+.22*h13(id+seed);
  float cr=smoothstep(rad,rad*.6,d)*.35-smoothstep(rad*1.2,rad,d)*smoothstep(rad*.8,rad,d)*.2;
  alb=vec3(.52,.51,.5)*(.55+.6*f)*(1.-cr);}
 else alb=mix(vec3(.4,.26,.18),vec3(.72,.58,.44),f)*(.55+.45*fbm(n*12.+seed,3));
 return alb*max(dot(n,L),0.)*uLCol+alb*.003;
}
vec3 giant(vec3 n,vec3 L,vec3 ax,float seed){
 float lat=dot(n,ax); float w=fbm(n*3.+seed,4);
 float bands=sin(lat*16.+w*5.+fbm(n*9.,3)*2.);
 vec3 alb=mix(vec3(.86,.72,.54),vec3(.58,.38,.26),.5+.5*bands);
 alb=mix(alb,vec3(.95,.9,.82),smoothstep(.62,.8,fbm(n*6.+uTime*.01,3))*.35);
 float dl=dot(n,L); return alb*smoothstep(-.08,.35,dl)*max(dl+.08,0.)*uLCol;
}
mat2 r2m(float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}
vec3 earth(vec3 n,vec3 hp,vec3 L,vec3 rd,int k){
 float land=smoothstep(.49,.53,fbm(n*2.2+uBT[k].y,6));
 float cl=smoothstep(.52,.72,fbm(n*4.+vec3(uTime*.004,0,0)+uBT[k].y+3.,5));
 vec3 alb=mix(vec3(.02,.05,.13),mix(vec3(.1,.22,.07),vec3(.42,.36,.24),fbm(n*6.,3)),land);
 alb=mix(alb,vec3(.85),cl*.8);
 float dl=dot(n,L); vec3 c=alb*max(dl,0.)*uLCol;
 float night=1.-smoothstep(-.12,.06,dl);
 // regional lights
 float reg=land*smoothstep(.55,.72,fbm(n*14.+uBT[k].y,4))*pow(fbm(n*90.,3),5.)*4.;
 // city detail, computed camera-relative so it stays precise at street scale
 vec3 lc=(hp-uBX[k].xyz)*uBX[k].w;
 vec3 t1=normalize(cross(n,vec3(0,1,0))),t2=cross(n,t1); vec2 q=vec2(dot(lc,t1),dot(lc,t2));
 float px=2.*uTan/uRes.y*length(hp)*uBX[k].w; float lod=1.-smoothstep(.3,1.2,px);
 float blob=smoothstep(.35,.75,fbm(vec3(q*.012,2.),4));
 float dens=exp(-length(q)*.03)*(.35+.65*blob)+blob*.25*smoothstep(.62,.8,fbm(vec3(q*.004,9.),3));
 vec2 g=q*r2m(n3(vec3(q*.004,5.))*1.5)+vec2(n3(vec3(q*.03,3.)),n3(vec3(q*.03,7.)))*9.;
 float sw=min(abs(fract(g.x)-.5),abs(fract(g.y)-.5)); float street=smoothstep(.05,.0,sw)*step(.45,h13(vec3(floor(g),4.)));
 vec2 gh=g*.08; float hwy=smoothstep(.03,.0,min(abs(fract(gh.x)-.5),abs(fract(gh.y)-.5)))*step(.5,h13(vec3(floor(gh),6.)));
 float bld=step(.86,h13(vec3(floor(g*4.),7.)))*(.75+.25*sin(uTime*2.+h13(vec3(floor(g*4.),2.))*40.));
 float city=dens*dens*(street*.25+hwy*1.1+bld*1.3)*lod + dens*dens*.35*(1.-lod);
 c+=vec3(1.,.6,.24)*(reg+city*uBT[k].z)*night*(1.-cl*.7);
 float mu=max(dot(n,-rd),0.); c+=vec3(.25,.5,1.)*pow(1.-mu,4.)*smoothstep(-.3,.4,dl)*.6*length(uLCol);
 return c;
}
void main(){
 vec3 rd=camRay(gl_FragCoord.xy); float px=2.*uTan/uRes.y;
 float tb=1e30; int kb=-1;
 for(int k=0;k<6;k++){ if(k>=uNB)break; float R=uBP[k].w; float dc=length(uBP[k].xyz);
  vec2 h=isph(vec3(0),rd,uBP[k].xyz,R+px*dc); if(h.x>0.&&h.x<tb){tb=h.x;kb=k;} }
 vec3 col=vec3(0),add=vec3(0); float cov=0.;
 for(int k=0;k<6;k++){ if(k>=uNB)break; int ty=int(uBT[k].x+.5); vec3 c=uBP[k].xyz; float R=uBP[k].w;
  float tc=dot(c,rd); if(tc<=0.)continue; float d=length(c-rd*tc); bool occ=kb>=0&&kb!=k&&tb<tc;
  if(ty==3&&!occ){vec3 bc=bb(uBT[k].z);add+=bc*uBT[k].w*(R*R/(d*d+R*R*.05)*.05*uBX[k].x+exp(-max(d-R,0.)/(R*.2))*.25*step(R,d));}
  if(ty==4){ if(!occ)add+=vec3(.7,.8,1.)*uBT[k].z*.05*R*R/(d*d+R*R*.1);
   vec3 s=normalize(uBX[k].xyz); vec3 e1=normalize(cross(s,vec3(.3,.1,1.))),e2=cross(s,e1); float a=uTime*uBT[k].w;
   vec3 m=normalize(s*cos(.55)+(e1*cos(a)+e2*sin(a))*sin(.55));
   vec3 w0=-c; float b=dot(rd,m), dd=dot(rd,w0), e=dot(m,w0), den=max(1.-b*b,1e-5);
   float tr=(b*e-dd)/den, sl=(e-b*dd)/den;
   if(tr>0.&&!(kb>=0&&tb<tr)){ float dist=length(w0+tr*rd-sl*m); float wd=R*1.5+abs(sl)*.035;
    float face=pow(max(abs(b),0.),60.);
    add+=vec3(.55,.7,1.)*uBT[k].z*(exp(-dist*dist/(wd*wd))*exp(-abs(sl)/uBX[k].w)*(.4+R/wd)+face*.3*exp(-d/(R*30.)));}}
  if((ty==5||ty==1)&&d>R&&d<R*1.08){vec3 L=normalize(uLPos-c);float lit=clamp(dot(normalize(rd*tc-c),L)*.6+.5,0.,1.);
   add+=vec3(.3,.55,1.)*exp(-(d-R)/(R*.014))*lit*(ty==5?.5:.15)*length(uLCol);}
 }
 if(kb>=0){ int k=kb; int ty=int(uBT[k].x+.5); vec3 c=uBP[k].xyz; float R=uBP[k].w;
  float tc=dot(c,rd); float dcl=length(c-rd*tc); cov=clamp((R-dcl)/(px*tb)+.5,0.,1.);
  vec2 h=isph(vec3(0),rd,c,R); float th=h.x>0.?h.x:tc; vec3 hp=rd*th; vec3 n=normalize(hp-c); vec3 L=normalize(uLPos-hp);
  if(ty==0)col=rocky(n,L,uBT[k].y,false);
  else if(ty==2)col=rocky(n,L,uBT[k].y,true);
  else if(ty==1)col=giant(n,L,normalize(uBX[k].xyz),uBT[k].y);
  else if(ty==3){float mu=max(dot(n,-rd),0.);float g=fbm(n*9.+vec3(0,uTime*.12,0)+uBT[k].y,5);
   float sp=smoothstep(.5,.72,fbm(n*2.5+uTime*.06,4))*uBX[k].y;
   col=bb(uBT[k].z*(.9+.2*g))*uBT[k].w*(.3+.7*pow(mu,.45))*(.65+.7*g)*(1.-.55*sp);}
  else if(ty==4)col=vec3(.8,.9,1.)*uBT[k].z*2.;
  else col=earth(n,hp,L,rd,k);
 }
 vec4 P=vec4(col*cov,cov);
 for(int k=0;k<6;k++){ if(k>=uNB)break; if(int(uBT[k].x+.5)!=1||uBX[k].w<.5)continue;
  vec3 c=uBP[k].xyz; float R=uBP[k].w; vec3 nr=normalize(uBX[k].xyz); float dn=dot(rd,nr); if(abs(dn)<1e-5)continue;
  float tr=dot(c,nr)/dn; if(tr<=0.)continue; vec3 hp=rd*tr; float rr=length(hp-c)/R; if(rr<1.45||rr>2.35)continue;
  float dens=(.5+.5*sin(rr*38.+sin(rr*9.)*2.))*smoothstep(1.45,1.55,rr)*smoothstep(2.35,2.2,rr)*(.4+.6*h13(vec3(floor(rr*70.))));
  vec3 L=normalize(uLPos-hp); float sh=isph(hp,L,c,R).x>0.?.04:1.;
  vec3 rc=vec3(.85,.78,.66)*(abs(dot(nr,L))*.8+.08)*sh*uLCol; float ra=dens*.75;
  vec4 Rg=vec4(rc*ra,ra);
  P=(kb==k&&tb<tr)?P+Rg*(1.-P.a):Rg+P*(1.-ra);
 }
 o=vec4(P.rgb+add,P.a);
}`;

// ------------------------------------------------------------ volumetric gas (half resolution)
const VOL_FS = `#version 300 es
${COMMON}
uniform vec4 uVC; uniform int uVM; uniform vec4 uVP; uniform vec3 uVA,uVB; uniform float uVBr;
uniform vec4 uL[4]; uniform vec3 uLC[4];
out vec4 o;
float dens(vec3 p,out vec3 em){
 em=vec3(0); float r=length(p); if(r>1.)return 0.;
 if(uVM==0){ vec3 q=p*2.3+vec3(0.,0.,uTime*.008); float w=fbm(q*.9+uVP.w,3); float n=fbm(q+w*1.8,4);
  float d=smoothstep(.45,.82,n)*smoothstep(1.,.35,r); float m=fbm(q*.6+3.,2);
  em=mix(uVA,uVB,smoothstep(.38,.62,m))*d*d*uVP.x;
  float dust=smoothstep(.56,.7,fbm(q*1.7+7.,3))*smoothstep(1.,.5,r); return d*.5+dust*1.6; }
 if(uVM==1){ float R=uVP.z; vec3 dir=p/max(r,1e-4); float fil=fbm(dir*3.5+uVP.w,4), fil2=fbm(p*6.+uVP.w,3);
  float sh=exp(-pow((r-R*(.8+.32*fil))/(.05+.09*R),2.)); float d=sh*(.3+fil2*1.3);
  float inner=exp(-r*r/(R*R*.1+.002))*uVP.x;
  em=mix(uVA,uVB,smoothstep(.42,.62,fil))*d*1.4+vec3(1.,.9,.8)*inner*2.+vec3(1.,.75,.45)*sh*uVP.x*.6; return d; }
 vec3 q=p*3.2+vec3(uTime*.006,0.,0.); float w=fbm(q*.8,3); float n=fbm(q*1.1+w*2.,5);
 float d=smoothstep(.45,.8,n)*smoothstep(1.,.55,r);
 em=uVA*d*d*uVP.x*.25+uVB*n*n*n*n*.03; return d;
}
void main(){
 vec3 rd=camRay(gl_FragCoord.xy); vec2 tt=isph(vec3(0),rd,uVC.xyz,uVC.w);
 if(tt.y<0.){o=vec4(0);return;}
 float t0=max(tt.x,0.),t1=tt.y; const int N=42; float dt=(t1-t0)/float(N);
 float t=t0+dt*h13(vec3(gl_FragCoord.xy,1.)); vec3 acc=vec3(0); float Tr=1.; float R=uVC.w; float dtn=dt/R;
 for(int i=0;i<N;i++){
  vec3 pw=rd*t; vec3 em; float d=dens((pw-uVC.xyz)/R,em);
  if(d>.001||em.r+em.g+em.b>0.){
   vec3 li=vec3(0); for(int j=0;j<4;j++){ if(uL[j].w<=0.)continue; vec3 dl=uL[j].xyz-pw; li+=uLC[j]*uL[j].w/(1.+dot(dl,dl)/(R*R)*260.); }
   acc+=Tr*(em+li*d*(uVM==2?vec3(1.,.5,.32):vec3(1.)))*dtn*uVBr; Tr*=exp(-d*dtn*uVP.y*7.);
   if(Tr<.02)break; }
  t+=dt;
 }
 o=vec4(acc,1.-Tr);
}`;

// ------------------------------------------------------------ GPU particles: positions are pure functions of (id, time)
const PART_VS = `#version 300 es
${COMMON}
uniform int uMode; uniform uint uSeed;
uniform vec3 uO; uniform mat3 uM; uniform float uScale;
uniform vec4 uP0,uP1,uP2,uP3;
uniform float uBright,uRef,uPxMin,uMaxPx,uNear;
uniform vec4 uHide; uniform vec4 uProto[24];
out vec3 vCol; flat out float vShape; out vec2 vL;
uint bid;
float R(uint k){return hf(bid+k*0x9E3779B9u);}
float gs(uint k){return sqrt(-2.*log(max(R(k),1e-7)))*cos(6.2831853*R(k+1u));}
vec3 g3(uint k){return vec3(gs(k),gs(k+2u),gs(k+4u));}
vec3 sph(float a,float b){float z=2.*a-1.,r=sqrt(max(0.,1.-z*z)),p=6.2831853*b;return vec3(r*cos(p),z,r*sin(p));}
mat2 r2(float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}
void bas(vec3 n,out vec3 e1,out vec3 e2){e1=normalize(cross(n,abs(n.y)<.95?vec3(0,1,0):vec3(1,0,0)));e2=cross(n,e1);}
void main(){
 bid=hu(uint(gl_VertexID)*0x27d4eb2du^(uSeed*0x165667b1u));
 vec3 p=vec3(0),col=vec3(1); float lum=1.,size=0.,shape=0.; float t=uTime;
 if(uMode==0){ // local star field wrapped around the camera
  float B=uP0.x; p=mod(vec3(R(1u),R(2u),R(3u))*B-uP1.xyz,B)-B*.5;
  float rv=R(4u); float vis=clamp((uP0.y-rv)/(uP0.y*.2+1e-5),0.,1.);
  col=bb(2800.+pow(R(5u),2.6)*26000.);
  lum=(.25+pow(R(6u),14.)*60.)*vis*smoothstep(B*.5,B*.3,length(p))*(.85+.15*sin(t*(1.+R(7u)*3.)+R(8u)*40.));
 } else if(uMode==1){ // galaxies
  float ty=uP0.x; float tt=t*uP2.x;
  if(ty<.5){ float arms=uP0.y,tw=uP0.z,bul=uP0.w; float u0=R(0u);
   if(uP3.x>.5){ float r=.07+pow(R(1u),.8)*.95; float k=floor(R(2u)*arms);
    float th=k*6.2831853/arms+tw*log(r)-.38+gs(3u)*.05+tt/(r+.08);
    p=vec3(cos(th)*r,gs(5u)*.005,sin(th)*r); p.xz+=(vec2(R(7u),R(8u))-.5)*.035;
    lum=.3*smoothstep(1.05,.25,r); size=.012+.02*R(9u); shape=2.;
   } else if(u0<bul){ float r=.015+.2*pow(R(1u),2.2); p=sph(R(2u),R(3u))*r; p.y*=.6;
    col=bb(3500.+R(4u)*2000.); lum=.6+R(5u);
   } else { float r=min(-log(1.-R(1u)*.985)*.27,1.3); float inArm=step(R(2u),.72); float k=floor(R(3u)*arms);
    float th=k*6.2831853/arms+tw*log(max(r,.02)); th+=gs(4u)*mix(.9,.24+.1*r,inArm)+tt/(r+.08);
    float young=inArm*step(R(6u),.5);
    p=vec3(cos(th)*r,gs(7u)*uP2.y*mix(1.,.35,young)*(1.+r),sin(th)*r); p.xz+=vec2(gs(9u),gs(11u))*.012;
    col=bb(young>.5?7000.+R(13u)*20000.:3000.+pow(R(13u),2.)*5000.);
    lum=young>.5?1.5+pow(R(14u),6.)*10.:.5+pow(R(14u),8.)*6.;
    if(young>.5&&R(15u)<.03){col=vec3(1.,.35,.55);size=.01+.02*R(16u);lum=2.5;}
   }
  } else if(ty<1.5){ float s=sqrt(R(1u))*.97; float r=min(.22*s/(1.-s),2.);
   p=sph(R(2u),R(3u))*r*vec3(1.,.62,.8); p.xz=r2(tt*.6/(r+.1))*p.xz;
   col=bb(3200.+R(4u)*2200.); lum=.7+pow(R(5u),8.)*5.;
  } else { float c=floor(R(1u)*7.); vec3 cen=(h33(vec3(c,uP0.y,3.))-.5)*vec3(1.2,.3,1.2);
   p=cen+g3(2u)*(.08+.1*h13(vec3(c,5.,1.))); p.xz=r2(tt*.5/(length(p)+.2))*p.xz;
   col=R(8u)<.1?vec3(1.,.4,.6):bb(6000.+R(9u)*18000.); lum=.8+pow(R(10u),6.)*8.;
  }
  if(uP1.w>0.){ vec3 e=normalize(uP1.xyz); float r=length(p.xz); float f=uP1.w*smoothstep(.2,1.1,r); float al=dot(p,e);
   p+=e*al*f*1.6; p.xz=r2(f*1.3*sign(al+1e-4))*p.xz; p.y+=f*.18*al;
   if(R(20u)<.08*uP1.w){float s=R(21u); vec3 b=uP1.xyz*s+vec3(0,sin(s*3.14159)*.3,0)+g3(22u)*.05; p=mix(p,b,.9);}
  }
 } else if(uMode==2){ // asteroid belt
  float r=mix(uP0.x,uP0.y,sqrt(R(1u))); float th=R(2u)*6.2831853+uP0.w*t*pow(r,-1.5);
  p=vec3(cos(th)*r,gs(3u)*uP0.z,sin(th)*r); col=mix(vec3(.55,.5,.45),vec3(.8,.7,.6),R(5u));
  float big=pow(R(6u),12.); size=uP1.x*(.15+big*3.); lum=uP1.y*(.3+big*4.); shape=1.;
 } else if(uMode==3){ // comet
  float age=pow(R(1u),1.5)*uP0.w; vec3 nuc=uP0.xyz,vel=uP1.xyz; vec3 e=nuc-vel*age; vec3 a=normalize(e); float k=R(2u);
  if(k<.12){p=nuc+g3(3u)*uP2.x;col=vec3(.9,.95,1.);lum=2.;size=uP2.x*.5;}
  else if(k<.55){p=e+a*age*uP1.w*1.6+g3(3u)*age*uP2.y*.25;col=vec3(.45,.65,1.);lum=1.2*exp(-age/uP0.w*2.5);size=uP2.x*(.3+age*.4);}
  else{p=e+vel*age*.85+a*age*uP1.w*.5+g3(3u)*age*uP2.y;col=vec3(1.,.85,.62);lum=exp(-age/uP0.w*2.);size=uP2.x*(.4+age*.6);}
 } else if(uMode==4){ // matter around a black hole + tidal disruption stream
  float u=uP3.x>.5?.72+.28*R(1u):R(1u); float spd=uP0.z;
  if(u<.55){ float r=mix(uP0.x,uP0.y,pow(R(2u),1.6)); float th=R(3u)*6.2831853+spd*.7071*pow(r,-1.5)*t;
   p=vec3(cos(th)*r,gs(4u)*.06*r,sin(th)*r); col=bb(18000.*pow(r/uP0.x,-.75)); lum=(.4+R(6u))*pow(uP0.x/r,1.2)*.35; size=.015*r;
  } else if(u<.72){ float r=mix(uP0.y*.8,uP0.y*3.,R(2u)); float th=R(3u)*6.2831853+spd*.7071*pow(r,-1.5)*t;
   vec3 ax=sph(R(4u),R(5u)),e1,e2; bas(ax,e1,e2); p=(e1*cos(th)+e2*sin(th))*r;
   col=bb(3000.+pow(R(6u),2.)*20000.); lum=.5+pow(R(7u),8.)*20.;
  } else { float st=uP2.z,dur=uP2.y,r0=uP2.x; float el=t-st; if(el<=0.)lum=0.; else {
   float tau=st+R(2u)*min(el,dur); float x=clamp((tau-st)/dur,0.,1.);
   float rs=1.+(r0-1.)*sqrt(1.-x); float w0=spd*.7071*pow(r0,-1.5); float ths=w0*dur*4.*(1.-pow(1.-x,.25));
   float rrel=rs*(1.+(R(3u)-.5)*.3); float dtp=t-tau; float r=rrel*exp(-dtp*.09*r0/rrel);
   float th=ths+spd*.7071*pow(max(.5*(rrel+r),1.2),-1.5)*dtp+(R(4u)-.5)*.04;
   p=vec3(cos(th)*r,gs(5u)*.02*r,sin(th)*r); float heat=clamp(3./r,0.,3.);
   col=bb(5000.+heat*9000.); lum=uP2.w*(.5+heat)*smoothstep(1.4,2.2,r)*smoothstep(0.,.3,dtp+.05); } }
 } else if(uMode==5){ // binary black hole: two disks, bridge stream, circumbinary spiral
  vec3 A=uP0.xyz,B=uP1.xyz; float sep=max(uP3.x,.001),ph=uP2.x,mg=uP2.y; float u=R(1u);
  if(u<.6){ bool f=u<.3; vec3 C=f?A:B; float rr=mix(mix(2.4,max(2.8,.42*sep),pow(R(2u),1.3)),mix(2.6,15.,pow(R(2u),1.3)),mg);
   vec3 cc=mix(C,vec3(0),mg); vec3 n=normalize(mix(f?vec3(.15,1.,0.):vec3(-.1,1.,.12),vec3(0,1,0),mg)),e1,e2; bas(n,e1,e2);
   float th=R(3u)*6.2831853+2.5*pow(rr,-1.5)*t+ph*.4;
   p=cc+(e1*cos(th)+e2*sin(th))*rr+n*gs(4u)*.03*rr; col=bb(22000.*pow(rr/2.4,-.75)); lum=1.2*pow(2.4/rr,1.1);
  } else if(u<.75){ float s=fract(R(2u)+t*.35); vec3 mid=(A+B)*.5; vec3 pr=normalize(cross(B-A+1e-4,vec3(0,1,0)))*sep*.35;
   bool ab=R(3u)<.5; vec3 P0=ab?A:B,P2=ab?B:A,P1=mid+(ab?pr:-pr); p=mix(mix(P0,P1,s),mix(P1,P2,s),s)+g3(4u)*(.3+sep*.03);
   col=bb(9000.); lum=.9*(1.-mg)*sin(3.14159*s);
  } else { float r=mix(1.3,3.2,R(2u))*26.; bool arm=R(4u)<.6;
   float th=arm?ph+floor(R(5u)*2.)*3.14159+1.8*log(r/26.)+gs(6u)*.22:R(3u)*6.2831853; th+=.25*t*pow(r/26.,-1.5);
   p=vec3(cos(th)*r,gs(8u)*.5,sin(th)*r);
   if(uP2.w>0.){float dr=length(p.xz)-uP2.z; float wv=exp(-dr*dr*.004)*sin(dr*.35)*uP2.w; p.xz*=1.+wv*.06; p.y+=wv*2.; lum=1.+abs(wv)*3.;}
   col=bb(6000.+R(10u)*14000.); lum*=.4+pow(R(11u),10.)*20.;
  }
 } else if(uMode==6){ // supernova: outflowing dust (P1.y=1) / debris
  float tp=uP0.x; vec3 d=sph(R(2u),R(3u));
  if(uP1.y>.5){ float r0=1.15+fract(R(1u)+t*.03)*2.8; float r=max(r0,uP1.x*(1.+.06*R(4u)));
   p=d*r; col=r>r0?vec3(1.,.7,.45):vec3(1.,.5,.3); lum=.25*smoothstep(4.,1.3,r0)*(r>r0?3.*exp(-tp/5.):1.); size=.05;
  } else { if(tp<=0.)lum=0.; else {
   d=normalize(d+(h33(floor(d*4.)+uP0.w)-.5)*.55); float v=.3+.7*pow(R(4u),.6);
   float Rm=uP0.y*(1.-exp(-tp/4.5))+tp*.1; p=d*v*Rm; float k=R(5u);
   vec3 pc=k<.2?vec3(1.,.75,.3):k<.4?vec3(.3,1.,.55):k<.55?vec3(.7,.35,1.):k<.75?vec3(.35,.8,1.):vec3(1.,.35,.25);
   col=mix(pc,vec3(1.,.95,.9),exp(-tp/1.5)); lum=(.4+pow(R(6u),6.)*8.)*(exp(-tp/5.)*2.+.25)*uP0.z; size=.03+v*Rm*.008; } }
 } else if(uMode==7){ // protostars: collapsing envelopes, flattened accretion disks
  int k=gl_VertexID%24; vec4 S=uProto[k]; float kk=float(k); float on=smoothstep(S.w,S.w+2.5,t);
  vec3 ax=normalize(h33(vec3(kk,3.,7.))-.5+vec3(0,.6,0)),e1,e2; bas(ax,e1,e2);
  if(gl_VertexID<24){p=S.xyz;col=bb(mix(2500.,8000.,on));lum=mix(.5,40.,on);size=.02;}
  else{ float ph=fract(R(1u)+t*.07*(.6+R(2u)*.8)); float r=mix(1.3,.03,pow(ph,.8))*(.6+.4*h13(vec3(kk,1.,1.)));
   float th=R(3u)*6.2831853+1.4/(r+.04)+t*.3/(r+.1); float fl=smoothstep(.1,.9,r);
   vec3 ring=e1*cos(th)+e2*sin(th); vec3 dk=ring*r+ax*gs(4u)*.02*r; vec3 sp=normalize(mix(sph(R(6u),R(7u)),ring,.5))*r;
   p=S.xyz+mix(dk,sp,fl); float heat=smoothstep(.5,.02,r);
   col=mix(vec3(.8,.35,.2),bb(4000.+4000.*on),heat); lum=(.08+heat*1.2)*(.4+on*1.2); size=.03*r+.01; }
 } else if(uMode==8){ // cosmic web
  float N=uP0.x; vec3 cell=floor(vec3(R(1u),R(2u),R(3u))*N);
  vec3 na=cell+(h33(cell*1.3+.7)-.5)*.9; vec3 org=uP1.xyz+(h33(uP1.xyz*1.3+.7)-.5)*.9; float rich=h13(cell+2.1);
  if(R(4u)<.2){p=na+g3(5u)*(.02+.05*rich)*(R(11u)<.3?2.5:1.);col=mix(vec3(1.,.8,.55),vec3(1.,.95,.85),R(12u));lum=(.5+rich*1.5);}
  else{ int a=int(R(5u)*3.); vec3 of=a==0?vec3(1,0,0):a==1?vec3(0,1,0):vec3(0,0,1); vec3 cb=cell+of; vec3 nb=cb+(h33(cb*1.3+.7)-.5)*.9;
   float keep=step(.28,h13(cell*2.+of*5.)); float f=fract(R(6u)+t*uP0.z); float sp=mix(.5-.5*f,.5+.5*f,step(.5,R(7u)));
   vec3 bd=(h33(cell+of*3.)-.5)*.7; p=mix(na,nb,sp)+bd*sin(3.14159*sp)+(h33(cell+of*9.)-.5)*.25*sin(6.2832*sp)+g3(8u)*uP0.y*(R(14u)<.25?3.:1.);
   col=mix(vec3(.45,.55,1.),vec3(.8,.5,1.),R(15u)); lum=keep*1.1+(1.-keep)*.05; }
  p-=org;
 } else if(uMode==9){ // galaxy cluster: every point is a galaxy
  float u=R(1u); float r=.05+.8*pow(R(2u),1.8); vec3 d=sph(R(3u),R(4u)); p=d*r*vec3(1.,.8,.9);
  if(u<.02){p*=.12;lum=12.;size=.02;col=vec3(1.,.85,.65);}
  else if(u>.93){p*=.6;size=.15;lum=.4;col=vec3(1.,.85,.7)*.6;}
  else{lum=.6+pow(R(5u),6.)*6.;size=.006+.01*R(6u);col=R(7u)<.6?vec3(1.,.82,.6):vec3(.7,.8,1.);}
 } else if(uMode==10){ // dust threaded on magnetic field lines
  float k=floor(R(1u)*uP0.x); vec3 hk=h33(vec3(k,1.3,7.7)); vec3 c=(hk-.5)*uP0.w;
  vec3 ax=normalize(h33(vec3(k,5.1,2.3))-.5),e1,e2; bas(ax,e1,e2);
  float s=fract(R(2u)+t*uP1.x)-.5; float L=uP0.y*(.5+hk.x); float ph=s*12.+k;
  p=c+ax*s*L+(e1*cos(ph)+e2*sin(ph))*uP0.z*(.5+hk.y)+g3(3u)*uP0.z*.25+e1*sin(s*3.+k)*L*.15;
  col=mix(vec3(1.,.5,.35),vec3(.6,.5,1.),hk.z); lum=.3*(1.-4.*s*s); size=uP0.z*.4;
 } else { // dense star cluster (Plummer sphere)
  float u=max(R(1u),1e-4); float r=min(uP0.x/sqrt(pow(u,-2./3.)-1.),uP0.x*8.);
  p=sph(R(2u),R(3u))*r; p.xz=r2(t*.05/(r/uP0.x+.5))*p.xz;
  col=bb(R(4u)<.08?15000.+R(5u)*10000.:3200.+pow(R(5u),2.)*3000.); lum=.5+pow(R(6u),10.)*25.;
 }
 vec3 w=uO+uM*p; float vz=dot(w,uCamF);
 if(vz<uNear||lum<=0.){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=0.;return;}
 float vx=dot(w,uCamR),vy=dot(w,uCamU); float asp=uRes.x/uRes.y;
 if(abs(vx)>vz*uTan*asp*1.1||abs(vy)>vz*uTan*1.1){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=0.;return;}
 if(uHide.w>0.){float cz=dot(uHide.xyz,uCamF);if(vz>cz&&cz>0.){vec2 a=vec2(vx,vy)*(cz/vz)-vec2(dot(uHide.xyz,uCamR),dot(uHide.xyz,uCamU));
  if(length(a)<uHide.w){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=0.;return;}}}
 gl_Position=vec4(vx/(uTan*asp),vy/uTan,0.,vz);
 float pxs=size*uScale/(vz*uTan)*uRes.y*.5; float ps=clamp(pxs,uPxMin,uMaxPx);
 float I=lum*uBright*uRef*uRef/(vz*vz+uRef*uRef);
 vCol=shape>1.5?vec3(clamp(lum*uBright,0.,1.)):col*I*(uPxMin*uPxMin)/(ps*ps);
 gl_PointSize=ps; vShape=shape; vL=vec2(0);
 if(shape>.5&&shape<1.5){vec3 Lw=uO-w;vL=normalize(vec2(dot(Lw,uCamR),dot(Lw,uCamU))+1e-6);}
}`;
const PART_FS = `#version 300 es
precision highp float;
in vec3 vCol; flat in float vShape; in vec2 vL; out vec4 o;
void main(){vec2 q=gl_PointCoord*2.-1.;q.y=-q.y;float r2=dot(q,q);if(r2>1.)discard;float a=exp(-r2*4.);
 if(vShape>.5&&vShape<1.5){vec3 n=vec3(q,sqrt(1.-r2));a=smoothstep(1.,.8,r2)*(max(dot(n,normalize(vec3(vL,.4))),0.)+.03)*1.6;}
 o=vec4(vCol*a,0.);}`;

// ------------------------------------------------------------ glare sprites for individual luminous objects
const SPR_VS = `#version 300 es
${COMMON}
layout(location=0) in vec4 aP; layout(location=1) in vec4 aC; layout(location=2) in vec4 aX;
uniform float uNear;
out vec2 vP; out float vCore,vHalf; out vec4 vC; out vec2 vX;
void main(){int id=gl_VertexID;vec2 c=vec2((id==1||id==2||id==4)?1.:-1.,(id==2||id==4||id==5)?1.:-1.);
 vec3 w=aP.xyz;float vz=dot(w,uCamF);if(vz<uNear){gl_Position=vec4(2,2,2,1);return;}
 vec2 ndc=vec2(dot(w,uCamR)/(uRes.x/uRes.y),dot(w,uCamU))/(vz*uTan);
 float core=max(aP.w/(vz*uTan)*uRes.y*.5,1.);
 float hs=core*3.+clamp(sqrt(aC.w)*14.*aX.y,0.,uRes.y*.6);
 vP=c*hs;vCore=core;vHalf=hs;vC=aC;vX=aX.xy;gl_Position=vec4(ndc+c*hs/(uRes*.5),0.,1.);}`;
const SPR_FS = `#version 300 es
precision highp float;
in vec2 vP; in float vCore,vHalf; in vec4 vC; in vec2 vX; out vec4 o;
void main(){float r=length(vP),c=vCore;float core=exp(-r*r/(c*c));float halo=c*c/(c*c+r*r*.15)*.08*vX.y;
 float sp=0.;if(vX.x>0.){vec2 a=abs(vP);sp=(exp(-a.y/(1.+c*.15))*exp(-a.x/(vHalf*.35))+exp(-a.x/(1.+c*.15))*exp(-a.y/(vHalf*.35)))*.25*vX.x;}
 o=vec4(vC.rgb*vC.w*(core+halo+sp)*smoothstep(vHalf,vHalf*.6,r),0.);}`;

// ------------------------------------------------------------ post: temporal blur, bloom pyramid, tone mapping
const BLIT_FS = `#version 300 es
precision highp float; uniform sampler2D uT; uniform vec2 uInv; out vec4 o;
void main(){o=texture(uT,gl_FragCoord.xy*uInv);}`;
const ACC_FS = `#version 300 es
precision highp float; uniform sampler2D uCur,uPrev; uniform float uTrail; uniform vec2 uInv; out vec4 o;
void main(){vec2 uv=gl_FragCoord.xy*uInv;o=vec4(mix(texture(uCur,uv).rgb,texture(uPrev,uv).rgb,uTrail),1.);}`;
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
uniform sampler2D uImg,uBloom; uniform vec2 uRes; uniform float uExp,uBloomAmt,uFade,uFlash,uTime; uniform vec4 uRipS; uniform vec3 uFlashCol;
out vec4 o;
float h(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec2 uv=gl_FragCoord.xy/uRes;
 if(uRipS.w>0.){vec2 d=uv-uRipS.xy;vec2 da=vec2(d.x*(uRes.x/uRes.y),d.y);float r=length(da),x=r-uRipS.z;uv+=d/max(r,1e-4)*exp(-x*x*260.)*sin(x*110.)*uRipS.w*.02;}
 vec2 d=uv-.5; float ca=.0025*dot(d,d)*4.;
 vec3 c=vec3(texture(uImg,uv+d*ca).r,texture(uImg,uv).g,texture(uImg,uv-d*ca).b);
 c+=texture(uBloom,uv).rgb*uBloomAmt;
 c=c*uExp+uFlashCol*uFlash;
 c=aces(c); c=pow(c,vec3(1./2.2));
 c*=mix(.62,1.,smoothstep(1.35,.35,length(vec2(d.x*(uRes.x/uRes.y),d.y)*2.)));
 c+=(h(gl_FragCoord.xy+fract(uTime*7.)*391.)-.5)*.012;
 o=vec4(max(c,0.)*uFade,1.);}`;
