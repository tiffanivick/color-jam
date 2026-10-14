(path)=>{
  blocks.filter(b=>b.crate).forEach(b=>{hitCrate(b); hitCrate(b);});
  const orig=blocks.map(b=>b.cells.map(c=>[c[0],c[1]]));
  const offOf=i=>[blocks[i].cells[0][0]-orig[i][0][0], blocks[i].cells[0][1]-orig[i][0][1]];
  for (const [kind,i,off] of path){
    const b=blocks[i];
    if(b.removed) return "block already gone at "+kind+" "+i;
    if(isFrozen(b)) return "frozen block moved at "+kind+" "+i;
    const reach=computeReachable(b);
    if(kind==="park"){
      const cur=offOf(i);
      const d=[off[0]-cur[0], off[1]-cur[1]];
      const s=reach.get(stateKey(d[0],d[1]));
      if(!s||s.exitDir||s.noStop) return "park unreachable "+i+" "+JSON.stringify(d)+(s&&s.noStop?" (noStop)":"");
      b.cells=shiftCells(b.cells,d[0],d[1]);
      moves++; updateHUD(); afterMove();
    } else {
      const s=[...reach.values()].find(s=>s.exitDir);
      if(!s) return "no gate reachable for "+i;
      exitBlock(b,b.el,s);
    }
    if(levelOver && !blocks.every(b=>!isNeeded(b)||b.removed)) return "level ended early (boom or time)";
  }
  return blocks.every(b=>!isNeeded(b)||b.removed)?"ok":"not all removed";
}
