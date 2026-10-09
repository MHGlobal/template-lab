"""Procedural 13 Graus Sul PROTOTYPE CGI, not official logo; no AI content."""
import math,os
import bpy,bmesh
from mathutils import Vector
def material(name,rgb,rough=.7):
    m=bpy.data.materials.new(name);m.use_nodes=True
    b=m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value=(*rgb,1)
    b.inputs["Roughness"].default_value=rough
    return m
def main():
    bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
    s=bpy.context.scene
    s.render.engine="CYCLES";s.cycles.device="CPU";s.cycles.samples=int(os.environ["SAMPLES"])
    if hasattr(bpy.context.view_layer,"cycles"):bpy.context.view_layer.cycles.use_denoising=False
    s.render.resolution_x=int(os.environ["WIDTH"]);s.render.resolution_y=int(os.environ["HEIGHT"])
    s.render.resolution_percentage=100;s.render.fps=int(os.environ["FPS"])
    count=int(os.environ["FRAMES"]);s.frame_start=1;s.frame_end=count
    s.render.image_settings.file_format="PNG";s.render.image_settings.color_mode="RGB"
    s.view_settings.view_transform="AgX" if bpy.app.version >= (4,0,0) else "Standard"
    s.world.use_nodes=True
    s.world.node_tree.nodes["Background"].inputs["Color"].default_value=(.014,.024,.034,1)
    root=bpy.data.objects.new("Product animation root",None);bpy.context.collection.objects.link(root)
    outline=[(-.32,1.12),(-.68,1.17),(-1.27,.89),(-1.04,.4),(-.81,.51),
        (-.78,-1.25),(.78,-1.25),(.81,.51),(1.04,.4),(1.27,.89),
        (.68,1.17),(.32,1.12),(.26,1.01),(.14,.94),(0,.92),(-.14,.94),(-.26,1.01)]
    mesh=bpy.data.meshes.new("Tshirt mesh")
    mesh.from_pydata([(x,y,0) for x,y in outline],[],[tuple(range(len(outline)))])
    mesh.update();bm=bmesh.new();bm.from_mesh(mesh)
    bmesh.ops.triangulate(bm,faces=list(bm.faces))
    bmesh.ops.subdivide_edges(bm,edges=list(bm.edges),cuts=7,use_grid_fill=True)
    bm.to_mesh(mesh);bm.free()
    shirt=bpy.data.objects.new("13GS demo shirt",mesh)
    bpy.context.collection.objects.link(shirt);shirt.parent=root
    cotton=material("Off-white woven cotton",(.77,.79,.78),.8)
    n=cotton.node_tree.nodes;l=cotton.node_tree.links
    noise=n.new("ShaderNodeTexNoise");noise.inputs["Scale"].default_value=145
    bump=n.new("ShaderNodeBump");bump.inputs["Strength"].default_value=.14;bump.inputs["Distance"].default_value=.012
    l.new(noise.outputs["Fac"],bump.inputs["Height"])
    l.new(bump.outputs["Normal"],n["Principled BSDF"].inputs["Normal"])
    mesh.materials.append(cotton)
    for v in mesh.vertices:
        x,y,_=v.co;v.co.z=.022*math.sin(x*4.5+y*2)+.012*math.cos(y*7-x)
    shirt.shape_key_add(name="Base");flutter=shirt.shape_key_add(name="Fabric movement")
    for v in flutter.data:
        x,y,z=v.co;v.co.z=z+.055*math.sin(x*4+y*2.3)+.016*(1.1-y)
    for frame,value in [(1,0),(max(2,count//2),.78),(count,.12)]:
        flutter.value=value;flutter.keyframe_insert(data_path="value",frame=frame)
    ink=material("Graphite imprint",(.035,.045,.056),.85)
    for label,y,size in [("13°S",.20,.52),("INSPIRED BY PEMBA",-.26,.095),("DEMO ONLY",-.83,.078)]:
        cu=bpy.data.curves.new("Demo text","FONT");cu.body=label
        cu.align_x="CENTER";cu.align_y="CENTER";cu.size=size
        ob=bpy.data.objects.new("DEMO "+label,cu)
        bpy.context.collection.objects.link(ob);ob.parent=root
        ob.location=(0,y,.14);cu.materials.append(ink)
    for frame,angle in [(1,-.12),(max(2,count//2),.14),(count,-.10)]:
        root.rotation_euler=(.015,angle,0)
        root.keyframe_insert(data_path="rotation_euler",frame=frame)
    bpy.ops.object.camera_add(location=(0,0,7))
    cam=bpy.context.object;cam.rotation_euler=(0,0,0)
    cam.data.type="ORTHO";cam.data.ortho_scale=3.2;s.camera=cam
    for name,loc,power,tint,size in [
        ("Softbox",(-3,2.8,4.1),650,(.84,.9,1),3.2),
        ("Warm rim",(3,.8,1.9),510,(1,.71,.43),2.1),
        ("Fill",(0,-2.7,4),330,(.66,.84,1),2.7)]:
        bpy.ops.object.light_add(type="AREA",location=loc)
        ob=bpy.context.object;ob.name=name;ob.data.energy=power
        ob.data.color=tint;ob.data.shape="DISK";ob.data.size=size
        ob.rotation_euler=(Vector((0,0,0))-ob.location).to_track_quat("-Z","Y").to_euler()
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.7))
    bpy.context.object.data.materials.append(material("Dark blue studio",(.009,.018,.026),.92))
    s.frame_set(1);s.render.filepath="//frames/frame_#####"
    os.makedirs("cgi/work",exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath("cgi/work/scene.blend"),compress=True)
if __name__=="__main__":main()
