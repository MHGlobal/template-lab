from pathlib import Path

ROOT = Path("rs-music")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f"Patch target not found: {label}")
    return text.replace(old, new, 1)


def patch_music_model() -> None:
    path = ROOT / "app/src/main/kotlin/com/mhglobal/rsmusic/MusicModel.kt"
    text = path.read_text()
    old = '    val listDensity=settings.listDensity.stateIn(viewModelScope,SharingStarted.WhileSubscribed(5000),"comfortable")\n'
    new = old + (
        '    val accentColor=settings.accentColor.stateIn(viewModelScope,SharingStarted.WhileSubscribed(5000),"red")\n'
        '    val motionStyle=settings.motionStyle.stateIn(viewModelScope,SharingStarted.WhileSubscribed(5000),"spring")\n'
        '    val motionSpeed=settings.motionSpeed.stateIn(viewModelScope,SharingStarted.WhileSubscribed(5000),100)\n'
        '    val gestureFollow=settings.gestureFollow.stateIn(viewModelScope,SharingStarted.WhileSubscribed(5000),true)\n'
    )
    text = replace_once(text, old, new, "MusicModel motion state")
    path.write_text(text)


def patch_tools() -> None:
    path = ROOT / "app/src/main/kotlin/com/mhglobal/rsmusic/ToolsScreens.kt"
    text = path.read_text()
    old = '''        }\n        item {\n            HorizontalDivider();Text(stringResource(R.string.gestures),style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Bold,modifier=Modifier.padding(top=16.dp))\n'''
    new = '''        }\n        item { RsAppearanceMotionSettings(vm) }\n        item {\n            HorizontalDivider();Text(stringResource(R.string.gestures),style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Bold,modifier=Modifier.padding(top=16.dp))\n'''
    text = replace_once(text, old, new, "Settings appearance/motion section")
    path.write_text(text)


def patch_fixed_ui() -> None:
    path = ROOT / "app/src/main/kotlin/com/mhglobal/rsmusic/RsMusicFixedUi.kt"
    text = path.read_text()

    text = replace_once(
        text,
        '    val onboarded by vm.onboardingComplete.collectAsStateWithLifecycle()\n    val dark = theme != "Light"\n',
        '    val onboarded by vm.onboardingComplete.collectAsStateWithLifecycle()\n    val accentId by vm.accentColor.collectAsStateWithLifecycle()\n    val dark = theme != "Light"\n    val accent = rsAccentColor(accentId)\n    val accentContainer = rsAccentContainer(accentId, dark)\n',
        "accent state"
    )
    text = text.replace('        primary = Color(0xFFFF304D),\n', '        primary = accent,\n', 1)
    text = text.replace('        primaryContainer = Color(0xFF45101A),\n', '        primaryContainer = accentContainer,\n', 1)
    text = text.replace('        primary = Color(0xFFE51D3D),\n', '        primary = accent,\n', 1)

    mini_start = text.index('@Composable\nprivate fun RsMiniPlayer')
    mini_end = text.index('@Composable\nprivate fun RsHomeScreen', mini_start)
    mini = text[mini_start:mini_end]
    mini = replace_once(
        mini,
        '    val hapticsEnabled by vm.haptics.collectAsStateWithLifecycle()\n',
        '    val hapticsEnabled by vm.haptics.collectAsStateWithLifecycle()\n    val motionStyle by vm.motionStyle.collectAsStateWithLifecycle()\n    val motionSpeed by vm.motionSpeed.collectAsStateWithLifecycle()\n    val gestureFollow by vm.gestureFollow.collectAsStateWithLifecycle()\n    val reducedMotion by vm.reducedMotion.collectAsStateWithLifecycle()\n',
        "mini motion state"
    )
    mini = mini.replace('.rsPlayerGestures(', '.rsMotionGestures(', 1)
    mini = replace_once(
        mini,
        '                longSwipeCategory = longSwipe,\n',
        '                longSwipeCategory = longSwipe,\n                followFinger = gestureFollow,\n                motionStyle = motionStyle,\n                motionSpeed = motionSpeed,\n                reducedMotion = reducedMotion,\n',
        "mini motion args"
    )
    mini = mini.replace('                onOpenLyrics = { feedback(); onOpen() },\n', '                onOpenVertical = { feedback(); onOpen() },\n', 1)
    mini = mini.replace('                onDismiss = {}\n', '                onDismissVertical = {}\n', 1)
    text = text[:mini_start] + mini + text[mini_end:]

    player_start = text.index('@Composable\nprivate fun RsPlayerScreen')
    player_end = text.index('@Composable\nprivate fun RsPlayerTool', player_start)
    player = text[player_start:player_end]
    player = replace_once(
        player,
        '    val doubleTapFavorite by vm.doubleTapFavorite.collectAsStateWithLifecycle()\n',
        '    val doubleTapFavorite by vm.doubleTapFavorite.collectAsStateWithLifecycle()\n    val motionStyle by vm.motionStyle.collectAsStateWithLifecycle()\n    val motionSpeed by vm.motionSpeed.collectAsStateWithLifecycle()\n    val gestureFollow by vm.gestureFollow.collectAsStateWithLifecycle()\n    val reducedMotion by vm.reducedMotion.collectAsStateWithLifecycle()\n',
        "player motion state"
    )
    player = replace_once(
        player,
        '    Column(Modifier.fillMaxSize().background(atmosphereBrush).padding(horizontal = 18.dp)) {\n',
        '    RsPlayerMotionContainer(\n        modifier = Modifier.fillMaxSize().background(atmosphereBrush).padding(horizontal = 18.dp),\n        enabled = gesturesEnabled,\n        followFinger = gestureFollow,\n        motionStyle = motionStyle,\n        motionSpeed = motionSpeed,\n        reducedMotion = reducedMotion,\n        onDismiss = { feedback(); onClose() }\n    ) {\n',
        "player motion container"
    )
    player = player.replace('.rsPlayerGestures(', '.rsMotionGestures(', 1)
    player = replace_once(
        player,
        '                            longSwipeCategory = longSwipe,\n',
        '                            longSwipeCategory = longSwipe,\n                            followFinger = gestureFollow,\n                            motionStyle = motionStyle,\n                            motionSpeed = motionSpeed,\n                            reducedMotion = reducedMotion,\n',
        "artwork motion args"
    )
    player = player.replace('                            onOpenLyrics = { feedback(); onPanel("lyrics") },\n', '                            onOpenVertical = { feedback(); onPanel("lyrics") },\n', 1)
    player = player.replace('                            onDismiss = { feedback(); showUpNext = true }\n', '                            onDismissVertical = { feedback(); onClose() }\n', 1)
    player = player.replace('colors = IconButtonDefaults.filledIconButtonColors(containerColor = Color(0xFFFF304D), contentColor = Color.White)', 'colors = IconButtonDefaults.filledIconButtonColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = MaterialTheme.colorScheme.onPrimary)', 1)
    player = player.replace('RsPlayerOptionsSheet(it, vm, onLyrics = { showOptions = false; onPanel("lyrics") }, onClose = { showOptions = false })', 'RsProfessionalPlayerOptionsSheet(it, vm, onLyrics = { showOptions = false; onPanel("lyrics") }, onClose = { showOptions = false })', 1)
    text = text[:player_start] + player + text[player_end:]

    path.write_text(text)


def patch_motion_experience() -> None:
    path = ROOT / "app/src/main/kotlin/com/mhglobal/rsmusic/MotionExperience.kt"
    text = path.read_text()
    old = ''' ) {\n    var ty by remember { mutableFloatStateOf(0f) }\n    val scope=rememberCoroutineScope()\n    val spec=remember(motionStyle,motionSpeed,reducedMotion) { rsMotionSpec(motionStyle,motionSpeed,reducedMotion) }\n    Column(\n        modifier\n            .graphicsLayer {\n                translationY=if(followFinger) ty.coerceAtLeast(0f) else 0f\n                val p=min(1f,ty.coerceAtLeast(0f)/max(1f,size.height*.75f))\n                scaleX=1f-p*.025f;scaleY=1f-p*.025f;alpha=1f-p*.18f\n            }\n'''.replace(' ) {', ') {')
    new = ''') {\n    var ty by remember { mutableFloatStateOf(if(reducedMotion) 0f else 420f) }\n    val scope=rememberCoroutineScope()\n    val spec=remember(motionStyle,motionSpeed,reducedMotion) { rsMotionSpec(motionStyle,motionSpeed,reducedMotion) }\n    LaunchedEffect(motionStyle,motionSpeed,reducedMotion) {\n        if(reducedMotion) ty=0f\n        else if(ty>0f) {\n            val start=ty\n            animate(start,0f,animationSpec=spec) { v,_ -> ty=v }\n        }\n    }\n    Column(\n        modifier\n            .graphicsLayer {\n                val raw=ty.coerceAtLeast(0f)\n                val p=min(1f,raw/max(1f,size.height*.75f))\n                translationY=if(followFinger && motionStyle !in listOf("fade","scale")) raw else 0f\n                val scaleLoss=if(motionStyle=="scale") p*.07f else p*.025f\n                scaleX=1f-scaleLoss;scaleY=1f-scaleLoss\n                alpha=if(motionStyle=="fade") 1f-p*.92f else 1f-p*.18f\n            }\n'''
    text = replace_once(text, old, new, "player entry motion")
    path.write_text(text)


patch_music_model()
patch_tools()
patch_fixed_ui()
patch_motion_experience()
print("RS Music motion patch applied")
