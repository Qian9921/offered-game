const puppeteer=require('puppeteer'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--disable-gpu']});
  for(const [w,h] of [[1366,768],[1440,900],[1280,720],[2560,1440]]){
    const p=await b.newPage(); await p.setViewport({width:w,height:h});
    await p.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'});
    await p.evaluate(()=>localStorage.clear()); await p.reload({waitUntil:'domcontentloaded'});
    await sleep(2000);
    await p.screenshot({path:`/tmp/title_${w}x${h}.png`});
    await p.close();
    console.log('shot', w+'x'+h);
  }
  await b.close();
})();
