/** Energy share of the three declared macronutrients (E%). Other energy sources
 * such as fibre, polyols and alcohol are excluded from the denominator. */
export type MacroEnergy = { protein:number; carbs:number; fat:number; total:number };
export function macroEnergy(protein:number|null,carbs:number|null,fat:number|null):MacroEnergy|null {
 const values=[protein,carbs,fat];
 if(values.some(v=>v===null||!Number.isFinite(v)||v<0||v>100))return null;
 const [p,c,f]=values as number[];
 const energies=[p*4,c*4,f*9];
 const total=energies.reduce((a,b)=>a+b,0);
 if(total<=0)return null;
 return {protein:energies[0]/total*100,carbs:energies[1]/total*100,fat:energies[2]/total*100,total};
}

/** Largest remainder rounding: displayed whole E% always totals exactly 100. */
export function roundedMacroEnergy(value:MacroEnergy):{protein:number;carbs:number;fat:number} {
 const raw=[value.protein,value.carbs,value.fat];
 const rounded=raw.map(x=>Math.floor(x));
 const remaining=100-rounded.reduce((a,b)=>a+b,0);
 const order=raw.map((x,i)=>({i,part:x-rounded[i]})).sort((a,b)=>b.part-a.part||a.i-b.i);
 for(let n=0;n<remaining;n++)rounded[order[n%3].i]++;
 return {protein:rounded[0],carbs:rounded[1],fat:rounded[2]};
}
