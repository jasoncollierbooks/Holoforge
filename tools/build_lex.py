# Builds lex/<letter>.json shards from WordNet 3.1 (Princeton license; see LEXICON-LICENSE.txt).
import json,re,os,collections,sys
SRC=sys.argv[1] if len(sys.argv)>1 else '/tmp/wn/package/dict';OUT=os.path.join(os.path.dirname(__file__),'..','lex')
syn={}
for pos in ['noun','verb','adj','adv']:
  for line in open(f'{SRC}/data.{pos}',encoding='latin-1'):
    if line.startswith('  '):continue
    head,_,gloss=line.partition(' | ');f=head.split()
    off,p=f[0],f[2];n=int(f[3],16);words=[f[4+2*i].lower() for i in range(n)];k=4+2*n;pc=int(f[k]);hy=[]
    for i in range(pc):
      sym,o,pp=f[k+1+4*i],f[k+2+4*i],f[k+3+4*i]
      if sym in('@','@i'):hy.append((pp if pp!='s' else 'a')+o)
    g=gloss.split(';')[0].strip().strip('"')
    syn[(p if p!='s' else 'a')+off]=(p if p!='s' else 'a',[re.sub(r'\(.*\)','',w) for w in words],g,hy)
def chain(sid,d=0,seen=None):
  out=[]
  for h in syn[sid][3][:1]:
    if h in syn and d<5:out.append(syn[h][1][0]);out+=chain(h,d+1)
  return out
lem=collections.defaultdict(list)
for pos in ['noun','verb','adj','adv']:
  for line in open(f'{SRC}/index.{pos}',encoding='latin-1'):
    if line.startswith('  '):continue
    f=line.split();w=f[0];p=f[1];sc=int(f[2]);pc=int(f[3]);offs=f[6+pc-2:][:sc] if False else f[4+pc+2:]
    if re.search(r'\d',w) or w.count('_')>2:continue
    for o in offs[:3 if pos=='noun' else 2]:
      key=(p if p!='s' else 'a')+o
      if key not in syn:key='a'+o
      if key not in syn:continue
      P,words,g,_=syn[key]
      lem[w].append([P,g[:110],[x for x in words if x!=w][:5],chain(key)[:5]])
shards=collections.defaultdict(dict)
for w,v in lem.items():
  c=(w[:2] if len(w)>1 and w[1].isalpha() else w[0]+'_') if w[0].isalpha() else '_';shards[c][w]=v
tot=0
for c,d in shards.items():
  s=json.dumps(d,separators=(',',':'),ensure_ascii=False);os.makedirs(f'{OUT}/{c[0]}',exist_ok=True);open(f'{OUT}/{c[0]}/{c}.json','w').write(s);tot+=len(s)
print(len(lem),'lemmas',len(shards),'shards',tot//1024,'KB raw')
