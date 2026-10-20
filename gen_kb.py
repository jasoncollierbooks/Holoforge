# Builds the Lab Assistant knowledge: kb/core.json (always loaded) + kb/<shard>.json (lazy) + kb/tables.json (reference tables)
import json,sys,math,glob
sys.path.insert(0,'/workspace/text-cad');import stddata as S, materials as MT
out={}
def add(shard,d,t,g,a,s=""): out.setdefault(shard,[]).append(dict(d=d,t=t,g=g,a=a,s=s))
# 1. existing hand-written knowledge
for f in sorted(glob.glob('/workspace/text-cad/knowledge/*.md')):
    if f.endswith('README.md'):continue
    t=open(f).read(); dom=t.split('\n')[0].lstrip('# ').strip()
    for blk in t.split('\n## ')[1:]:
        L=blk.split('\n'); g=s_='';b=[]
        for l in L[1:]:
            if l.startswith('tags:'):g=l[5:].strip()
            elif l.startswith('source:'):s_=l[7:].strip()
            elif l.strip() and not l.startswith('pro:'):b.append(l.strip())
        add('core',dom,L[0].strip(),g,' '.join(b),s_)
# 2. formulas & rules of thumb (hand-checked)
F=[("Mechanics","Cantilever bending stress","cantilever, bending, stress, beam, bracket arm","Rectangular cantilever with end load: stress σ = 6·F·L / (b·h²). F in N, L, b, h in mm gives MPa. Doubling thickness h cuts stress to a quarter."),
("Mechanics","Cantilever deflection","cantilever, deflection, sag, droop","Tip deflection of a cantilever with end load: δ = F·L³ / (3·E·I). For a rectangle I = b·h³/12. Deflection grows with the cube of length."),
("Mechanics","Simply supported beam, center load","simply supported, center load, point load, beam stress","Max moment M = F·L/4 at mid-span; deflection δ = F·L³/(48·E·I)."),
("Mechanics","Simply supported beam, uniform load","uniform load, udl, distributed, floor beam","Max moment M = w·L²/8; deflection δ = 5·w·L⁴/(384·E·I), with w as load per length."),
("Mechanics","Fixed-fixed beam, uniform load","fixed ends, built in, encastre","Max moment at the supports M = w·L²/12; mid-span deflection δ = w·L⁴/(384·E·I), five times stiffer than simply supported."),
("Mechanics","Bending stress from moment","bending stress, section modulus, mc/i","σ = M·c / I = M / Z, where c is the distance to the outer fibre and Z = I/c is the section modulus."),
("Mechanics","Second moment of area, rectangle","moment of inertia, second moment, rectangle, I","Rectangle about its centroid: I = b·h³/12; section modulus Z = b·h²/6."),
("Mechanics","Second moment of area, round bar","moment of inertia, circle, round, rod, shaft","Solid circle: I = π·d⁴/64, Z = π·d³/32. Hollow tube: I = π·(D⁴ − d⁴)/64."),
("Mechanics","Polar moment and shaft torsion","torsion, torque, shaft stress, polar moment, J","Solid shaft: J = π·d⁴/32, shear stress τ = 16·T/(π·d³). Twist angle θ = T·L/(G·J) in radians."),
("Mechanics","Shear modulus from E","shear modulus, G, poisson","G = E / (2·(1+ν)). For steel G ≈ 79–81 GPa; for aluminium ≈ 26 GPa."),
("Mechanics","Axial stress and strain","axial, tension, compression, stress, strain, hooke","Stress σ = F/A, strain ε = σ/E, elongation ΔL = F·L/(A·E)."),
("Mechanics","Euler column buckling","buckling, column, euler, strut, slender","Critical load P = π²·E·I / (K·L)². K = 1 pinned-pinned, 0.5 fixed-fixed, 0.7 fixed-pinned, 2 fixed-free (flagpole). Applies to slender columns only."),
("Mechanics","Slenderness ratio","slenderness, kl/r, radius of gyration","Slenderness = K·L/r with r = √(I/A). Steel columns above about 100–120 are governed by Euler buckling; short stubby ones by yield."),
("Mechanics","Thin-walled pressure vessel","pressure vessel, hoop stress, cylinder, tank, pipe wall","Hoop stress σ = p·r/t, longitudinal σ = p·r/(2t). A sphere sees p·r/(2t). Valid when t < r/10."),
("Mechanics","Von Mises stress","von mises, equivalent stress, combined","For bending plus torsion: σ_vm = √(σ² + 3τ²). Yield when σ_vm reaches the yield strength (ductile metals)."),
("Mechanics","Factor of safety","factor of safety, fos, safety factor, margin","FoS = strength / actual stress. Ductile metal static: 1.5–2; plastics and prints: 2–4; lifting: 4–6."),
("Mechanics","Stress concentration","stress concentration, kt, notch, hole, fillet","A small round hole in a wide plate triples peak stress (Kt ≈ 3). Generous fillets (r/d > 0.1) keep Kt below about 1.7."),
("Mechanics","Fatigue endurance limit","fatigue, endurance limit, cyclic, vibration","Steels: endurance limit roughly 0.5 × ultimate tensile strength (up to ~700 MPa) for polished specimens; real parts are lower. Aluminium has no true endurance limit."),
("Mechanics","Thermal expansion","thermal expansion, cte, grow, heat","ΔL = α·L·ΔT. Steel α ≈ 12×10⁻⁶/°C, aluminium ≈ 23×10⁻⁶, PLA ≈ 68×10⁻⁶, concrete ≈ 10×10⁻⁶."),
("Mechanics","Thermal stress when restrained","thermal stress, restrained, constrained heat","Fully restrained bar: σ = E·α·ΔT. Steel heated 50 °C restrained: ≈ 200000·12e-6·50 = 120 MPa."),
("Mechanics","Spring rate of coil spring","spring rate, spring constant, coil spring, k","k = G·d⁴ / (8·D³·n), d wire Ø, D mean coil Ø, n active coils."),
("Mechanics","Hooke's law for springs","hooke, spring force, f=kx","F = k·x. Springs in series: 1/k = 1/k1 + 1/k2. In parallel: k = k1 + k2."),
("Mechanics","Friction","friction, coefficient, mu, slide","Friction force F = μ·N. Typical μ: steel on steel dry 0.5–0.8, lubricated 0.1; rubber on dry concrete 0.6–0.85; PTFE 0.04–0.1."),
("Mechanics","Torque and power","torque, power, rpm, watts, motor","P (W) = T (N·m) × ω (rad/s), ω = 2π·rpm/60. So P = T·rpm/9.549."),
("Mechanics","Horsepower","horsepower, hp, kw","1 mechanical hp = 745.7 W. Torque (lb·ft) = hp × 5252 / rpm."),
("Mechanics","Kinetic and potential energy","energy, kinetic, potential, joules","Kinetic E = ½·m·v²; potential E = m·g·h with g = 9.81 m/s²."),
("Mechanics","Centripetal force","centripetal, rotating, spin, flywheel","F = m·v²/r = m·ω²·r."),
("Mechanics","Flywheel energy","flywheel, inertia, rotational energy","E = ½·I·ω². Solid disc I = ½·m·r²; thin ring I = m·r²."),
("Mechanics","Bolt tightening torque","bolt torque, tightening, preload, nut factor","T ≈ K·F·d with nut factor K ≈ 0.2 dry steel, 0.15 lubricated. Preload is often 70–75% of proof load."),
("Mechanics","Bolt shear capacity","bolt shear, single shear, double shear","Shear strength ≈ 0.6 × tensile strength × area. Double shear (clevis) doubles capacity."),
("Mechanics","Bearing life L10","bearing life, l10, ball bearing, rating","L10 (million revs) = (C/P)³ for ball bearings, (C/P)^(10/3) for roller bearings. Hours = L10·10⁶ / (60·rpm)."),
("Mechanics","Gear basics","gear, module, pitch diameter, teeth","Pitch Ø = module × teeth; outside Ø = module × (teeth + 2); centre distance = module × (z1+z2)/2. Meshing gears need the same module."),
("Mechanics","Gear ratio","gear ratio, speed ratio, reduction","Ratio = driven teeth / driver teeth. Output speed divides by the ratio, output torque multiplies by it (minus losses ~2% per spur mesh)."),
("Mechanics","Diametral pitch","diametral pitch, dp, inch gears","Diametral pitch P = teeth / pitch Ø (in). Module = 25.4 / P."),
("Mechanics","Belt and pulley speed","pulley, belt, speed, ratio","Speed ratio = driven Ø / driver Ø. Belt speed v = π·D·rpm/60."),
("Mechanics","Lever and mechanical advantage","lever, mechanical advantage, fulcrum","Effort × effort arm = load × load arm. Pulley block MA ≈ number of rope segments supporting the load."),
("Mechanics","Screw / leadscrew force","leadscrew, screw jack, lead, thrust","Ideal thrust F = 2π·T·η / lead. Acme screws are about 30–40% efficient, ball screws about 90%."),
("Mechanics","Inclined plane","incline, ramp, slope force","Force along a frictionless slope = m·g·sinθ; normal force = m·g·cosθ."),
("Fluids","Flow rate","flow rate, q=va, continuity","Q = v·A. When a pipe narrows, velocity rises in proportion to the area ratio."),
("Fluids","Bernoulli","bernoulli, pressure velocity","p + ½ρv² + ρgh is constant along a streamline (no losses)."),
("Fluids","Hydrostatic pressure","hydrostatic, water pressure, depth, head","p = ρ·g·h. Water: about 9.81 kPa per metre of depth, or 0.433 psi per foot."),
("Fluids","Drag force","drag, air resistance, cd","F = ½·ρ·v²·Cd·A. Air ρ ≈ 1.225 kg/m³. Cd: flat plate ≈ 1.2, sphere ≈ 0.47, streamlined body ≈ 0.04."),
("Fluids","Reynolds number","reynolds, laminar, turbulent","Re = ρ·v·D/μ. Pipe flow is laminar below about 2300, turbulent above about 4000."),
("Fluids","Wind pressure","wind load, wind pressure","Dynamic pressure q = ½·ρ·v². At 30 m/s (108 km/h) q ≈ 0.55 kPa; building codes add gust and shape factors."),
("Fluids","Pump power","pump power, hydraulic power","Hydraulic power P = ρ·g·Q·H = Δp·Q. Divide by pump efficiency (often 0.5–0.8)."),
("Fluids","Hydraulic cylinder force","hydraulic cylinder, ram, piston force","F = p × piston area. 100 bar on a 50 mm bore ≈ 19.6 kN. Retract force uses area minus rod area."),
("Thermal","Conduction","conduction, heat flow, fourier, k","Q = k·A·ΔT / t. k (W/m·K): copper 400, aluminium 205, steel 50, stainless 16, glass 1, wood 0.12, foam 0.03."),
("Thermal","Convection","convection, heat transfer coefficient, h","Q = h·A·ΔT. h: still air 5–10, moving air 10–100, water 500–10000 W/m²·K."),
("Thermal","Radiation","radiation, stefan boltzmann, emissivity","Q = ε·σ·A·(T₁⁴ − T₂⁴), σ = 5.67×10⁻⁸ W/m²K⁴, temperatures in kelvin."),
("Thermal","Heat to warm something","specific heat, heat capacity, warm water","Q = m·c·ΔT. Water c = 4186 J/kg·K; aluminium 900; steel 490; air 1005."),
("Thermal","R-value and U-value","r-value, u-value, insulation","U = 1/R_total. Heat loss = U·A·ΔT. US R-value (ft²·°F·h/BTU) × 0.176 = RSI (m²·K/W)."),
("Electrical","Ohm's law","ohm, voltage, current, resistance","V = I·R. Power P = V·I = I²·R = V²/R."),
("Electrical","Resistors in series and parallel","series, parallel, resistors","Series: R = R1 + R2. Parallel: 1/R = 1/R1 + 1/R2; two equal resistors in parallel give half."),
("Electrical","Voltage divider","voltage divider, divider","Vout = Vin × R2/(R1+R2)."),
("Electrical","LED resistor","led resistor, current limiting","R = (Vsupply − Vled) / I. Red LED ≈ 2 V, blue/white ≈ 3 V, 10–20 mA typical."),
("Electrical","Capacitor RC time","rc time constant, capacitor charging","τ = R·C; a capacitor charges to 63% in one τ and is about 99% charged after 5τ."),
("Electrical","Battery runtime","battery life, mah, runtime","Hours ≈ capacity (Ah) / load (A), derate about 20%. Energy Wh = Ah × V."),
("Electrical","Wire voltage drop","voltage drop, wire length, cable","Drop = I × R_wire × 2 × length (there and back). Keep under 3% for most circuits."),
("Electrical","Copper resistivity","resistivity, copper, aluminium wire","Copper ρ ≈ 1.72×10⁻⁸ Ω·m (0.0172 Ω·mm²/m); aluminium ≈ 2.82×10⁻⁸. R = ρ·L/A."),
("Electrical","Three-phase power","three phase, 3 phase power","P = √3 · V_line · I · PF."),
("Electrical","Motor sizing","motor sizing, stepper, servo","Size the motor for peak torque with a 1.5–2× margin; steppers lose torque quickly with speed."),
("Geometry","Circle","circle area, circumference","Area = π·r²; circumference = 2·π·r = π·d."),
("Geometry","Sphere","sphere volume, ball","Volume = 4/3·π·r³; surface = 4·π·r²."),
("Geometry","Cylinder","cylinder volume, tank volume","Volume = π·r²·h; surface = 2πr·h + 2πr²."),
("Geometry","Cone","cone volume","Volume = ⅓·π·r²·h."),
("Geometry","Triangle and Pythagoras","pythagoras, right triangle, hypotenuse","c² = a² + b². Area = ½·base·height. 3-4-5 is a handy right-angle check for layout."),
("Geometry","Trig ratios","sine, cosine, tangent, angle","sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = opposite/adjacent."),
("Geometry","Roof pitch to angle","roof pitch, rise run, slope angle","Angle = atan(rise/run). 4/12 ≈ 18.4°, 6/12 ≈ 26.6°, 8/12 ≈ 33.7°, 12/12 = 45°."),
("Geometry","Bolt circle hole positions","bolt circle, pcd, hole coordinates","Hole i at angle θ = 360°·i/n: x = R·cosθ, y = R·sinθ. Chord between neighbours = 2R·sin(180°/n)."),
("Geometry","Arc length and chord","arc length, chord, sagitta","Arc s = r·θ (radians). Chord c = 2r·sin(θ/2). Sagitta h = r − √(r² − (c/2)²)."),
("Geometry","Hexagon","hexagon, across flats, across corners","Across corners = across flats / cos30° = 1.1547 × AF. Area = 0.866 × AF²."),
("Construction","Stair rule of thumb","stairs, rise, run, tread","US residential (IRC): rise ≤ 7¾ in (196 mm), tread ≥ 10 in (254 mm). Comfort rule 2·rise + run ≈ 24–25 in (610–635 mm)."),
("Construction","Concrete volume","concrete volume, yards, slab","Volume = L × W × thickness. 1 cubic yard = 0.765 m³; order 5–10% extra."),
("Construction","Rebar sizes (US)","rebar, #4, bar size","US bar number = diameter in eighths of an inch: #3 = 3/8 in (9.5 mm), #4 = 1/2 in (12.7 mm), #5 = 5/8 in (15.9 mm)."),
("Construction","Joist span rule of thumb","joist span, floor joist","A rough guide for span in feet is joist depth in inches + half that. 2×10 joists at 16 in centres span about 14–15 ft. Always check the span tables in your code."),
("Construction","Deflection limits","deflection limit, l/360, span ratio","Common limits: floors L/360 live load, roofs L/240, cantilevers L/180."),
("Construction","Wood screw pilot hole","pilot hole, wood screw","Pilot about 60–70% of the shank in softwood and 85–90% in hardwood; clearance hole the full shank in the top board."),
("Construction","Snow load","snow load, roof load","Fresh snow is about 1 kPa per metre of depth (≈ 100 kg/m³); wet snow can reach 3–4 kPa per metre. Ground snow loads come from local code maps."),
("Manufacturing","3D print tolerance","print tolerance, clearance, fit, fdm","For FDM, use 0.2–0.3 mm clearance for a sliding fit and about 0.1 mm interference for a press fit. Print a test coupon first."),
("Manufacturing","Infill and strength","infill, perimeters, print strength","More perimeters (walls) add far more strength than more infill; 3–4 walls with 20–40% infill suits most functional parts."),
("Manufacturing","Layer orientation","layer lines, anisotropy, print orientation","FDM parts are weakest across the layers (about 50–70% of in-plane strength). Orient so the load runs along the layers."),
("Manufacturing","Sheet metal bend radius","bend radius, sheet metal, k factor","Minimum inside bend radius is about 1× thickness for mild steel and 1–2× for 6061-T6 aluminium. K-factor ≈ 0.33–0.45."),
("Manufacturing","Bend allowance","bend allowance, flat pattern","BA = θ(rad) × (R + K·t)."),
("Manufacturing","Cutting speed and rpm","cutting speed, rpm, machining, sfm","rpm = 1000·Vc / (π·D) with Vc in m/min, D in mm. Typical HSS Vc: aluminium 100+, mild steel 25–30, stainless 10–15."),
("Manufacturing","Feed rate","feed rate, chip load, milling","Feed (mm/min) = rpm × teeth × chip load per tooth."),
("Manufacturing","Weld size rule","fillet weld, weld size","Fillet weld throat = 0.707 × leg. Strength ≈ throat × length × allowable shear."),
("Manufacturing","ISO fits","h7, h6, fit, shaft hole tolerance","H7/h6 is a sliding/locational fit, H7/p6 a press fit, H7/g6 a close running fit."),
("Product","Cost estimate quick rule","cost estimate, part cost","Part cost ≈ material + machine time × rate + setup / batch size. Setup dominates small runs."),
]
for d,t,g,a in F: add('core',d,t,g,a,"standard textbook relation")
# 3. materials
for k,v in MT.M.items():
    add('materials',"Materials",f"{k} properties",f"{k.lower()}, material, properties, density, yield, modulus",
        f"{k}: Young's modulus ≈ {v['E']/1000:g} GPa, yield/working strength ≈ {v['yield_']} MPa, density {v['density']} kg/m³, Poisson's ratio {v['nu']}, rough cost ${v['cost']}/kg. Usual process: {v['process']}.","typical room-temperature values")
# 4. fasteners
for k,v in S.ISO_BOLTS.items():
    r=dict(zip(S.BOLT_COLS,v))
    add('fasteners',"Fasteners",f"{k} metric bolt data",f"{k.lower()}, metric bolt, tap drill, clearance hole, {k.lower()} screw",
        f"{k} coarse: pitch {r['pitch']} mm, tap drill {r['tap_drill']} mm, clearance hole {r['clearance_close']} mm close / {r['clearance_normal']} mm normal, socket head Ø{r['head_d']} × {r['head_h']} mm, hex {r['hex_af']} mm across flats, nut height {r['nut_h']} mm, washer OD {r['washer_od']} mm, stress area {r['stress_area_mm2']} mm².","ISO 261/4762/4032/273")
    for g,(rm,rp) in S.BOLT_GRADES.items():
        if g in("8.8","12.9"): add('fasteners',"Fasteners",f"{k} grade {g} proof load",f"{k.lower()}, {g}, bolt strength, load capacity",f"{k} grade {g}: tensile strength ≈ {rm*r['stress_area_mm2']/1000:.1f} kN, yield load ≈ {rp*r['stress_area_mm2']/1000:.1f} kN (stress area {r['stress_area_mm2']} mm² × {rm}/{rp} MPa). Design working loads are well below this.","computed from ISO 898-1 strengths")
for k,v in S.UNC_BOLTS.items():
    r=dict(zip(S.UNC_COLS,v))
    add('fasteners',"Fasteners",f"{k} UNC bolt data",f"{k}, unc, inch bolt, tap drill",f"{k} UNC: major Ø {r['major_d']} mm, {r['tpi']} threads per inch, tap drill ≈ {r['tap_drill']} mm, clearance ≈ {r['clearance']} mm, hex ≈ {r['hex_af']} mm across flats, stress area {r['stress_area_mm2']} mm².","ASME B1.1")
for g,(rm,rp) in S.BOLT_GRADES.items(): add('fasteners',"Fasteners",f"Bolt grade {g}",f"grade {g}, bolt grade, property class",f"Grade {g}: tensile strength ≈ {rm} MPa, yield/proof ≈ {rp} MPa.","ISO 898-1 / SAE J429")
UNF={"#10-32":32,"1/4-28":28,"5/16-24":24,"3/8-24":24,"7/16-20":20,"1/2-20":20,"5/8-18":18,"3/4-16":16}
for k,t in UNF.items(): add('fasteners',"Fasteners",f"{k} UNF fine thread",f"{k}, unf, fine thread",f"{k} UNF has {t} threads per inch (pitch {25.4/t:.3f} mm).","ASME B1.1")
FINE={"M8":1.0,"M10":1.25,"M12":1.25,"M14":1.5,"M16":1.5,"M18":1.5,"M20":1.5,"M24":2.0}
for k,p in FINE.items(): add('fasteners',"Fasteners",f"{k} fine pitch",f"{k.lower()} fine, metric fine thread",f"Common fine pitch for {k} is {p} mm; tap drill ≈ {float(k[1:])-p:g} mm.","ISO 261")
# 5. bearings, keys, extrusions, pipe, lumber, beams
for k,v in S.BEARINGS.items(): add('parts',"Bearings",f"{k} bearing",f"{k} bearing, ball bearing, deep groove",f"{k}: bore {v[0]} mm, OD {v[1]} mm, width {v[2]} mm, dynamic load C ≈ {v[3]} kN, static C0 ≈ {v[4]} kN.","typical catalogue (SKF/NSK class)")
for lo,hi,b,h,t1 in S.KEYS: add('parts',"Mechanical",f"Key for shaft {lo}–{hi} mm",f"key, keyway, shaft {hi}, din 6885",f"Shafts over {lo} up to {hi} mm: parallel key {b}×{h} mm, shaft groove depth {t1} mm.","DIN 6885")
for k,v in S.EXTRUSIONS.items(): add('parts',"Frames",f"{k} T-slot extrusion",f"{k}, t-slot, aluminium extrusion, profile",f"{k} profile: {v[0]} mm series, slot width {v[1]} mm, centre hole Ø{v[2]} mm (tap for M{5 if v[0]==20 else 8}), about {v[3]} kg/m.","typical (Misumi/80-20 style)")
for k,(od,w) in S.PIPE.items(): add('parts',"Pipe",f'{k} schedule 40 pipe',f'{k} pipe, nps, schedule 40, pipe od',f'{k} NPS schedule 40: OD {od} mm ({od/25.4:.3f} in), wall {w} mm, ID ≈ {od-2*w:.1f} mm.',"ASME B36.10")
for k,(a,b) in S.LUMBER.items(): add('construction',"Lumber",f"{k} lumber actual size",f"{k}, lumber, actual size, nominal",f"A nominal {k} is actually {a} × {b} in ({a*25.4:.0f} × {b*25.4:.0f} mm), dry dressed.","ALSC / PS 20")
for k,v in S.IPE.items(): r=dict(zip(S.IPE_COLS,v)); add('construction',"Steel sections",f"{k} beam",f"{k.lower()}, ipe, i-beam, steel section",f"{k}: depth {r['h']} mm, flange {r['b']} mm, web {r['tw']} mm, flange thickness {r['tf']} mm, {r['kg_per_m']} kg/m, Iy {r['Iy_cm4']} cm⁴, Wel,y {r['Wy_cm3']} cm³.","EN 10365")
for k,v in S.WSHAPES.items(): r=dict(zip(S.W_COLS,v)); add('construction',"Steel sections",f"{k} wide flange",f"{k.lower()}, w beam, wide flange, steel section",f"{k}: depth {r['d_in']} in, flange {r['bf_in']} in, web {r['tw_in']} in, flange thickness {r['tf_in']} in, {r['lb_per_ft']} lb/ft, Ix {r['Ix_in4']} in⁴.","AISC shapes database")
for s,f in S.SAFETY_FACTORS: add('core',"Safety",f"Safety factor: {s}","safety factor, factor of safety",f"Typical factor of safety for {s.lower()}: {f}.","common design practice")
# 6. AWG wire (computed from the AWG definition)
awg=[("0000",-3),("000",-2),("00",-1)]+[(str(n),n) for n in range(0,41)]
for name,n in awg:
    d=0.127*92**((36-n)/39);A=math.pi*d*d/4;R=17.24/A  # ohm/km, copper 20C
    add('electrical',"Wire",f"AWG {name} wire",f"awg {name}, {name} gauge wire, wire gauge",f"AWG {name}: diameter {d:.3f} mm ({d/25.4:.4f} in), area {A:.3f} mm², copper resistance ≈ {R:.2f} Ω/km ({R*0.3048:.3f} Ω per 1000 ft) at 20 °C. Ampacity depends on insulation and installation; use NEC/local tables.","AWG formula, copper 1.724e-8 Ω·m")
# 7. sheet gauges (Manufacturers' standard for steel)
for g,mm in {10:3.416,11:3.038,12:2.657,13:2.278,14:1.897,16:1.519,18:1.214,20:0.912,22:0.759,24:0.607,26:0.455,28:0.378}.items():
    add('manufacturing',"Sheet metal",f"{g} gauge steel sheet",f"{g} gauge, sheet steel thickness",f"{g} gauge steel sheet (Manufacturers' Standard) is {mm} mm ({mm/25.4:.4f} in) thick. Aluminium gauge numbers differ.","Manufacturers' Standard Gauge")
# 8. fractional drills
for i in range(1,65):
    from fractions import Fraction as Fr
    f=Fr(i,64);add('manufacturing',"Drills",f"{f} inch drill",f"{f} drill, {f} inch, fractional drill",f"A {f} in drill is {float(f):.4f} in = {float(f)*25.4:.3f} mm.","exact conversion")
# 9. unit conversions (exact or standard constants)
U=[("inch","mm",25.4),("foot","m",0.3048),("yard","m",0.9144),("mile","km",1.609344),("nautical mile","km",1.852),("pound (mass)","kg",0.45359237),("ounce","g",28.349523),("short ton","kg",907.18474),("long ton","kg",1016.0469),
("pound-force","N",4.4482216),("kilogram-force","N",9.80665),("kip","kN",4.4482216),("psi","kPa",6.8947573),("bar","kPa",100),("atmosphere","kPa",101.325),("ksi","MPa",6.8947573),("inch of mercury","kPa",3.38639),("inch of water","Pa",249.089),
("foot-pound","J",1.3558179),("BTU","kJ",1.0550559),("calorie","J",4.184),("kilowatt-hour","MJ",3.6),("horsepower","W",745.69987),("BTU/hour","W",0.29307107),("ton of refrigeration","kW",3.5168525),
("US gallon","L",3.7854118),("imperial gallon","L",4.54609),("cubic foot","L",28.316847),("cubic yard","m³",0.76455486),("cubic inch","cm³",16.387064),("fluid ounce (US)","mL",29.57353),("acre","m²",4046.8564),("square foot","m²",0.09290304),("square inch","mm²",645.16),("hectare","m²",10000),
("mph","km/h",1.609344),("knot","km/h",1.852),("ft/s","m/s",0.3048),("lb·ft (torque)","N·m",1.3558179),("lb·in (torque)","N·m",0.11298483),("pound per cubic foot","kg/m³",16.018463),("psf (lb/ft²)","Pa",47.880259),("lb/ft (linear)","kg/m",1.4881639),("in⁴","cm⁴",41.623143),("in³","cm³",16.387064),("gpm","L/min",3.7854118),("cfm","m³/h",1.6990108)]
for a,b,f in U:
    add('units',"Units",f"{a} to {b}",f"convert {a}, {a} to {b}, {b} to {a}",f"1 {a} = {f:g} {b}; 1 {b} = {1/f:.6g} {a}.","NIST SP 811")
    for v in (2,5,10,100): add('units',"Units",f"{v} {a} in {b}",f"{v} {a}, {v} {a} to {b}",f"{v} {a} = {v*f:.6g} {b}.","NIST SP 811")
for c in range(-40,301,10): add('units',"Units",f"{c} °C in °F",f"{c} c, {c} celsius, fahrenheit",f"{c} °C = {c*9/5+32:g} °F = {c+273.15:g} K.","exact")
from kb_extra import X
for d,t,g,a in X: add('core' if d.startswith('How') or d=='General' else 'trades',d,t,g,a,'general guidance; check local code / professional')
# 10. tables (lazy) for display
tabs=S.tables();tabs.append({"name":"AWG copper wire","cols":["awg","d_mm","area_mm2","ohm_per_km"],"rows":[[nm,round(0.127*92**((36-n)/39),3),round(math.pi*(0.127*92**((36-n)/39))**2/4,3),round(17.24/(math.pi*(0.127*92**((36-n)/39))**2/4),2)] for nm,n in awg],"units":"mm, Ω/km"})
tabs.append({"name":"Unit conversions","cols":["from","to","factor"],"rows":[[a,b,f] for a,b,f in U],"units":""})
json.dump(tabs,open('kb/tables.json','w'))
idx={}
for k,v in out.items(): json.dump(v,open(f'kb/{k}.json','w'),ensure_ascii=False);idx[k]=len(v)
json.dump({"shards":idx,"total":sum(idx.values())},open('kb/index.json','w'));print(idx,sum(idx.values()))
