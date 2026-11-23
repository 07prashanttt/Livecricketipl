import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export class Stadium3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07111f);
    this.scene.fog = new THREE.Fog(0x07111f, 35, 110);
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
    this.camera.position.set(0, 18, 31);
    this.camera.lookAt(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.clock = new THREE.Clock();
    this.ball = null;
    this.ballTween = null;
    this.build();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  build() {
    const hemi = new THREE.HemisphereLight(0xbadfff, 0x18331e, 2.0);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffedc5, 2.4);
    sun.position.set(-12, 28, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    this.scene.add(sun);

    const grass = new THREE.Mesh(new THREE.CircleGeometry(42, 80), new THREE.MeshStandardMaterial({ color: 0x176b3a, roughness: 1 }));
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.18;
    grass.receiveShadow = true;
    this.scene.add(grass);

    for (let i=0;i<8;i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(25 + i*1.55, 0.18, 4, 100), new THREE.MeshStandardMaterial({ color: i%2 ? 0x24485c : 0x315a70, roughness: .9 }));
      ring.rotation.x = Math.PI/2;
      ring.position.y = 1.2 + i*.45;
      this.scene.add(ring);
    }
    const stands = new THREE.Mesh(new THREE.CylinderGeometry(31, 27, 5, 80, 1, true), new THREE.MeshStandardMaterial({ color: 0x263f58, side: THREE.DoubleSide, roughness: .95 }));
    stands.position.y = 3.1;
    this.scene.add(stands);

    const pitch = new THREE.Mesh(new THREE.BoxGeometry(4.2, .18, 20), new THREE.MeshStandardMaterial({ color: 0xb99a68, roughness: 1 }));
    pitch.position.set(0, .05, 0);
    pitch.receiveShadow = true;
    this.scene.add(pitch);
    const creaseMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    [-7.5,7.5].forEach(z => {
      const line = new THREE.Mesh(new THREE.BoxGeometry(4.2,.025,.08), creaseMat);
      line.position.set(0,.16,z); this.scene.add(line);
    });
    this.addStumps(0, .2, -7.8);
    this.addStumps(0, .2, 7.8);
    this.batter = this.makePlayer(0, .2, 6.2, 0x18a8a0);
    this.bowler = this.makePlayer(0, .2, -12, 0xf0b52f);
    this.scene.add(this.batter, this.bowler);

    for (let i=0;i<8;i++) {
      const angle = i*Math.PI/4;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,13,8), new THREE.MeshStandardMaterial({color:0x34495e}));
      pole.position.set(Math.cos(angle)*30,7,Math.sin(angle)*30);
      this.scene.add(pole);
      const lamp = new THREE.PointLight(0xdceeff, 90, 28);
      lamp.position.set(Math.cos(angle)*30,14,Math.sin(angle)*30);
      this.scene.add(lamp);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.2,.5,.7), new THREE.MeshStandardMaterial({color:0xeaf5ff, emissive:0x8ebeff, emissiveIntensity:1.8}));
      panel.position.copy(lamp.position); this.scene.add(panel);
    }
    this.addCrowd();
  }

  makePlayer(x,y,z,color) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.48,1.05,4,8), new THREE.MeshStandardMaterial({color, roughness:.8}));
    body.position.y=1.15; body.castShadow=true; group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.32,12,10), new THREE.MeshStandardMaterial({color:0xb77c55}));
    head.position.y=2.05; head.castShadow=true; group.add(head);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(.65,.85,.45), new THREE.MeshStandardMaterial({color:0x202a38}));
    legs.position.y=.43; group.add(legs);
    const bat = new THREE.Mesh(new THREE.BoxGeometry(.16,1.7,.22), new THREE.MeshStandardMaterial({color:0xb8894c}));
    bat.position.set(.55,1.05,.15); bat.rotation.z=-.25; group.add(bat);
    group.position.set(x,y,z);
    return group;
  }

  addStumps(x,y,z) {
    const mat = new THREE.MeshStandardMaterial({color:0xf0e5c6});
    for (let i=-1;i<=1;i++) {
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,1.1,8),mat);
      stump.position.set(x+i*.18,y+.55,z); this.scene.add(stump);
    }
  }

  addCrowd() {
    const geo = new THREE.BufferGeometry();
    const points = [];
    for(let i=0;i<1700;i++){
      const a=Math.random()*Math.PI*2, r=27+Math.random()*7;
      points.push(Math.cos(a)*r,2+Math.random()*5,Math.sin(a)*r);
    }
    geo.setAttribute("position",new THREE.Float32BufferAttribute(points,3));
    this.scene.add(new THREE.Points(geo,new THREE.PointsMaterial({color:0xc5d4e0,size:.22,sizeAttenuation:true})));
  }

  playBall({ deliveryTime, choice }) {
    if (this.ball) this.scene.remove(this.ball);
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(.22,16,12),new THREE.MeshStandardMaterial({color:0xd92b32,roughness:.35}));
    this.ball.position.set(choice.line==="off"?-.8:choice.line==="leg"?.8:0,1.1,-11);
    this.scene.add(this.ball);
    const duration=Math.max(.65,deliveryTime/1000);
    this.ballTween={start:performance.now(),duration,from:this.ball.position.clone(),to:new THREE.Vector3(0,.35,5.7)};
  }

  resetBall() {
    if(this.ball){this.scene.remove(this.ball);this.ball=null;}
    this.ballTween=null;
  }

  resize() {
    const w=this.canvas.clientWidth||window.innerWidth, h=this.canvas.clientHeight||window.innerHeight;
    this.camera.aspect=w/h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w,h,false);
  }

  animate = () => {
    requestAnimationFrame(this.animate);
    const now=performance.now();
    if(this.ballTween && this.ball){
      const t=Math.min(1,(now-this.ballTween.start)/(this.ballTween.duration*1000));
      this.ball.position.lerpVectors(this.ballTween.from,this.ballTween.to,t);
      this.ball.position.y += Math.sin(t*Math.PI)*1.8;
      if(t>=1)this.ballTween=null;
    }
    this.renderer.render(this.scene,this.camera);
  };
}
