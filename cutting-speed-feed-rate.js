(() => {
 const ranges={
 mild:{hss:[80,100],carbide:[250,350],drilling:[80,100],turning:[100,150],chip:.0018},
 ss304:{hss:[60,80],carbide:[150,200],drilling:[50,80],turning:[80,120],chip:.0013},
 ss316:{hss:[50,70],carbide:[120,180],drilling:[40,70],turning:[60,100],chip:.0011},
 aluminum:{hss:[150,200],carbide:[400,600],drilling:[100,200],turning:[200,400],chip:.003},
 brass:{hss:[120,150],carbide:[300,400],drilling:[120,150],turning:[150,250],chip:.0025},
 castiron:{hss:[50,80],carbide:[150,250],drilling:[50,70],turning:[60,100],chip:.0015},
 titanium:{hss:[30,50],carbide:[100,150],drilling:[30,50],turning:[50,80],chip:.0008},
 toolsteel:{hss:[60,80],carbide:[180,250],drilling:[60,80],turning:[80,120],chip:.0012}
 };
 const f=document.querySelector("#speed-feed-form"),r=document.querySelector("#sf-results");
 f.addEventListener("submit",e=>{
  e.preventDefault(); const d=new FormData(f),metric=d.get("units")==="metric";
  const m=ranges[d.get("material")],op=d.get("operation"),dia0=+d.get("diameter"),dia=metric?dia0/25.4:dia0;
  const fl=+d.get("flutes"),custom=+d.get("custom_sfm"),sfm=custom>0?(metric?custom*3.28084:custom):(m[op][0]+m[op][1])/2;
  const rpm=sfm*12/(Math.PI*dia),chip=m.chip,feed=chip*fl*rpm;
  document.querySelector("#sf-rpm").textContent=Math.round(rpm).toLocaleString()+" RPM";
  document.querySelector("#sf-feed").textContent=(metric?feed*25.4:feed).toFixed(metric?1:2)+(metric?" mm/min":" IPM");
  document.querySelector("#sf-chip").textContent=(metric?chip*25.4:chip).toFixed(metric?3:4)+(metric?" mm/tooth":" in/tooth");
  document.querySelector("#sf-surface").textContent=(metric?sfm/3.28084:sfm).toFixed(0)+(metric?" m/min":" SFM");
  r.hidden=false;
 });
 f.addEventListener("reset",()=>setTimeout(()=>r.hidden=true,0));
})();
