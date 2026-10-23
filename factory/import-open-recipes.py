"""Import a deliberately small, photographed HowToCook collection. Requires Pillow.
Run from repository root: python3 factory/import-open-recipes.py
Keeps full original Markdown and license for attribution and review.
"""
import concurrent.futures, hashlib, io, json, pathlib, re, urllib.parse, urllib.request
from PIL import Image, ImageOps
ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = 'https://raw.githubusercontent.com/Anduin2017/HowToCook/'
# Pin the imported content, so updates are deliberate and repeatable.
REV = 'master'
SELECTION = [
 ('meat_dish/香菇滑鸡/香菇滑鸡', '荤菜', 35, '鲜嫩滑口，留一勺汤汁拌饭', ['咸鲜'], ['下饭菜']),
 ('vegetable_dish/手撕包菜/手撕包菜', '素菜', 20, '大火快炒，留住清脆的口感', ['酸辣'], ['快手菜', '下饭菜']),
 ('meat_dish/宫保鸡丁/宫保鸡丁', '荤菜', 90, '鸡丁嫩滑，花生酥脆', ['酸甜', '辣'], ['下饭菜']),
 ('vegetable_dish/虎皮青椒/虎皮青椒', '素菜', 15, '煎出虎皮，再裹一层酸甜酱汁', ['酸甜'], ['快手菜', '下饭菜']),
 ('soup/玉米排骨汤/玉米排骨汤', '汤', 90, '一锅清甜，慢慢炖出家的味道', ['清淡'], ['家常菜']),
 ('meat_dish/湖南家常红烧肉/湖南家常红烧肉', '荤菜', 60, '慢炖收汁，软糯浓香', ['酱香'], ['下饭菜']),
 ('vegetable_dish/地三鲜/地三鲜', '素菜', 30, '茄子、土豆、青椒的经典搭配', ['咸鲜'], ['下饭菜']),
 ('staple/西红柿鸡蛋挂面/西红柿鸡蛋挂面', '主食', 20, '一碗热面，照顾好自己的胃', ['酸甜'], ['快手菜', '一人食']),
 ('vegetable_dish/凉拌木耳/凉拌木耳', '凉菜', 25, '脆爽开胃，餐桌上的清新一口', ['酸辣'], ['家常菜']),
 ('aquatic/清蒸鲈鱼/清蒸鲈鱼', '荤菜', 25, '清蒸锁住鲜味，葱油提香', ['清淡'], ['家常菜']),
 ('vegetable_dish/上汤娃娃菜/上汤娃娃菜', '素菜', 25, '菜叶鲜甜，汤汁浓郁', ['咸鲜'], ['家常菜']),
 ('meat_dish/糖醋排骨/糖醋排骨', '荤菜', 45, '酸甜挂汁，每一口都很满足', ['酸甜'], ['下饭菜']),
 ('staple/日式咖喱饭/日式咖喱饭', '主食', 40, '浓浓咖喱，一盘就是一餐', ['咸鲜'], ['一人食']),
 ('dessert/烤蛋挞/烤蛋挞', '甜品', 35, '酥皮与奶香，留给下午的甜', ['甜'], ['甜品']),
]
OUT = ROOT / 'miniprogram/src/assets/recipes'
SOURCE = ROOT / 'docs/recipe-sources'
OUT.mkdir(parents=True, exist_ok=True); SOURCE.mkdir(parents=True, exist_ok=True)
def fetch(path):
 cache=ROOT/'.factory-cache'/REV/path
 if cache.exists():return cache.read_bytes()
 data=urllib.request.urlopen(BASE + REV + '/' + urllib.parse.quote(path), timeout=45).read()
 cache.parent.mkdir(parents=True,exist_ok=True);cache.write_bytes(data)
 return data
def clean(s):
 s=re.sub(r'!\[[^\]]*\]\([^)]+\)', '', s)
 s=re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', s)
 return s.replace('`','').replace('**','').strip()
def section(md, name):
 m=re.search(r'^## '+name+r'\s*\n(.*?)(?=^## |\Z)',md,re.M|re.S)
 return m.group(1) if m else ''
def build(item):
 path, category, minutes, desc, taste, scenes = item
 name=path.split('/')[-1]; rid='htc-'+hashlib.sha1(path.encode()).hexdigest()[:8]
 md=fetch('dishes/'+path+'.md').decode(); (SOURCE/(name+'.md')).write_text(md)
 image_matches=list(re.finditer(r'!\[([^\]]*)\]\(([^)]+)\)',md))
 # Upstream explicitly says this egg image was borrowed from the web; exclude it.
 image_matches=[m for m in image_matches if 'fryEgg' not in m[2]]
 images={}
 for i,m in enumerate(image_matches):
  relative=m[2].split(' "')[0]
  if relative.startswith('http'):continue
  urlpath=str(pathlib.PurePosixPath('dishes/'+path+'.md').parent / relative)
  try:
   data=fetch(urlpath)
   im=ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert('RGB'); im.thumbnail((640,640))
   filename=f'{rid}-{i}.jpg';im.save(OUT/filename, quality=66,optimize=True)
   images[m.start()]='/assets/recipes/'+filename
  except Exception as e:raise RuntimeError(f'Image download failed: {urlpath}') from e
 if not images:raise ValueError('No original photo for '+name)
 calc=section(md,'计算')
 ingredients=[]
 for line in calc.splitlines():
  if not re.match(r'^\s*[-*]\s+',line):continue
  line=clean(re.sub(r'^\s*[-*]\s+','',line))
  if len(line)<3 or line in ['必须配料','进阶配料','可选配料']:continue
  parts=re.split(r'\s*[:：=]\s*|\s+(?=\d)',line,maxsplit=1)
  ingredients.append({'name':parts[0], 'amount':parts[1] if len(parts)>1 else ''})
 if not ingredients:raise ValueError('No measured ingredients: '+name)
 operation=section(md,'操作'); steps=[]; step_images={}
 for line in operation.splitlines():
  if '![' in line and not clean(re.sub(r'^\s*\d+\.\s*','',line)):
   match=re.search(r'!\[[^\]]*\]\([^)]+\)',line)
   absolute=md.find(match[0]) if match else -1
   if steps and absolute in images and name in ['清蒸鲈鱼','西红柿鸡蛋挂面','上汤娃娃菜']:step_images[len(steps)-1]=images[absolute]
   continue
  if re.match(r'^### ',line):
   if '稍加复杂' in line:break # Choose one complete variant, never merge two alternatives.
   continue
  if re.match(r'^\s*(?:\d+[.、]|[-*])\s+',line):
   text=clean(re.sub(r'^\s*(?:\d+[.、]|[-*])\s+','',line))
   if text:
    if re.match(r'^\s+[-*]\s+',line) and steps:steps[-1]+='；'+text
    else:steps.append(text)
  elif re.match(r'^!\[',line) and steps:
   pos=md.find(line);image=images.get(pos)
   if image and name=='西红柿鸡蛋挂面':step_images[len(steps)-1]=image
 if not steps:raise ValueError('No steps: '+name)
 if name=='手撕包菜':
  pics=list(images.values());step_images={0:pics[0],1:pics[1],2:pics[2]}
 # Prefer explicit finished-dish labels; use last photo for cabbage/noodles, not preparation.
 cover=list(images.values())[0]
 for m in image_matches:
  if ('成品' in m[1] or m[1] in ['西红柿鸡蛋面']) and m.start() in images:cover=images[m.start()];break
 if name in ['手撕包菜','凉拌木耳','清蒸鲈鱼','糖醋排骨']:cover=list(images.values())[-1]
 if name=='凉拌木耳':
  pics=list(images.values());step_images={0:pics[2],1:pics[5],2:pics[6],3:pics[8],5:pics[9]}
 note=clean(re.sub(r'^\s*[-*]\s+.*$','',calc,flags=re.M)).strip()
 note=' '.join(note.split())
 # Keep every original instruction; source-specific reference images remain labeled as references.
 tips=[clean(re.sub(r'^[-*]\s*','',line)) for line in section(md,'附加内容').splitlines() if line.startswith(('- ','* '))]
 # This recipe contains pork; do not advertise it as a vegetarian dish.
 if name in ['手撕包菜','上汤娃娃菜']:category='荤菜'
 if name=='凉拌木耳':minutes=70
 if name=='地三鲜':minutes=40
 return dict(id=rid,name=name,category=category,cuisine='家常',desc=desc,cover=cover,
  ingredients=ingredients,ingredientNote=note,steps=steps,stepImages=step_images,
  gallery=list(images.values()),tips=tips,taste_tags=taste,scene_tags=scenes,
  difficulty=len(re.search(r'预估烹饪难度[：:]\s*(★+)',md)[1]),time_minutes=minutes,servings=0,
  nutrition={'calories':0,'note':''},source={'name':'HowToCook · 开源家常菜','url':'https://github.com/Anduin2017/HowToCook/blob/'+REV+'/'+urllib.parse.quote('dishes/'+path+'.md'),'license':'Unlicense'})
if __name__=='__main__':
 # Resolve once and record the exact upstream revision.
 meta=json.loads(urllib.request.urlopen('https://api.github.com/repos/Anduin2017/HowToCook/commits/master',timeout=30).read())
 REV=meta['sha']
 with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:recipes=list(pool.map(build,SELECTION))
 editorial=json.loads((ROOT/'factory/recipe-editorial.json').read_text())
 for recipe in recipes:
  recipe.update(editorial.get(recipe['name'],{}))
  recipe['source']['name']='HowToCook · 整理版'
 referenced={p.rsplit('/',1)[-1] for r in recipes for p in r['gallery']}
 for image in OUT.glob('htc-*.jpg'):
  if image.name not in referenced:image.unlink()
 (ROOT/'miniprogram/src/data/open-recipes.json').write_text(json.dumps(recipes,ensure_ascii=False,indent=2))
 (SOURCE/'LICENSE-HowToCook.txt').write_bytes(fetch('LICENSE'))
 (SOURCE/'README.md').write_text('# 精选菜谱来源\n\n来源：https://github.com/Anduin2017/HowToCook\n\n导入版本：'+REV+'\n\n许可：Unlicense，原文见 LICENSE-HowToCook.txt。保留原始 Markdown 便于核对，封面与步骤图均来自对应菜谱目录。\n\n展示时间为编辑估计，份量以各菜谱原文为准。不展示来源中未经核验的热量与健康功效描述。\n')
 print('Imported',len(recipes),'recipes;',sum(p.stat().st_size for p in OUT.glob('*.jpg')),'image bytes')
