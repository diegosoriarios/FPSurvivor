var UNITWIDTH = 90
var UNITHEIGHT = 45
var CATCHOFFSET = 120
var PLAYERSPEED = 800.0
var DINOSCALE = 20
var DINOSPEED = 400.0
var PLAYERCOLLISIONDISTANCE = 20
var DINOCOLLISIONDISTANCE = 55
var DINOMODEL = 'https://raw.githubusercontent.com/microsoft/Windows-appsample-get-started-js3d/master/GetStartedJS3D/models/dino.json'

var camera
var scene
var renderer
var gameOver = false
var controls
var controlsEnabled = false
var moveForward = false
var moveBackward = false
var moveLeft = false
var moveRight = false
var playerVelocity = new THREE.Vector3()
var clock
var totalCubesWide
var collidableObjects = []
var mapSize
var dinoVelocity = new THREE.Vector3()
var dino
var loader = new THREE.JSONLoader()
var instructions = document.getElementById('instructions')
var blocker = document.getElementById("blocker")
var dinoAlert = document.getElementById('dino-alert')
dinoAlert.style.display = 'none'

getPointerLock()
init()

function init() {
    clock = new THREE.Clock()
    listenForPlayerMovement()

    scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0xcccccc, 0.0015)

    renderer = new THREE.WebGLRenderer()
    renderer.setClearColor(scene.fog.color)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)

    var container = document.getElementById("container")
    container.appendChild(renderer.domElement)

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000)
    camera.position.y = 20
    camera.position.x = 0
    camera.position.z = 0
    scene.add(camera)

    controls = new THREE.PointerLockControls(camera)
    scene.add(controls.getObject())

    createMazeCubes()
    createGround()
    createPerimWalls()

    loader.load(DINOMODEL, function(geometry, materials) {
        var dinoObject = new THREE.Mesh(geometry, new THREE.MultiMaterial(materials))

        dinoObject.scale.set(DINOSCALE, DINOSCALE, DINOSCALE)
        dinoObject.rotation.y = degreesToRadians(-90)
        dinoObject.position.set(30, 0, -400)
        dinoObject.name = "dino"
        scene.add(dinoObject)

        dino = scene.getObjectByName("dino")

        instructions.innerHTML = "<strong>Click to Play!</strong> </br></br> W,A,S,D or arrow keys = move </br>Mouse = look around"

        animate()
    })

    addLights()

    window.addEventListener('resize', onWindowResize, false)
}

function addLights() {
    var lightOne = new THREE.DirectionalLight(0xffffff)
    lightOne.position.set(1, 1, 1)
    scene.add(lightOne)

    var lightTwo = new THREE.DirectionalLight(0xffffff, .5)
    lightTwo.position.set(1, -1, -1)
    scene.add(lightTwo)
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    renderer.setSize(window.innerWidth, window.innerHeight)
}

function getRandomInt(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min)) + min
}

function triggerChase() {
    if(dino.position.distanceTo(controls.getObject().position) < 300) {
        var lookTarget = new THREE.Vector3()
        lookTarget.copy(controls.getObject().position)
        lookTarget.y = dino.position.y

        dino.lookAt(lookTarget)

        var distanceFrom = Math.round(dino.position.distanceTo(controls.getObject().position)) - CATCHOFFSET
        dinoAlert.innerHTML = "Dino has spotted you! Distance from you: " + distanceFrom
        dinoAlert.style.display = ''

        return true
    } else {
        dinoAlert.style.display = 'none'
        return false
    }
}

function caught() {
    blocker.style.display = ''
    instructions.innerHTML = "GAME OVER </br></br></br> Press ESC to restart"
    gameOver = true
    instructions.style.display = ''
    dinoAlert.style.display = 'none'
}

function animate() {
    render()
    requestAnimationFrame(animate)
    
    var delta = clock.getDelta()
    
    var isBeingChased = triggerChase()

    if(dino.position.distanceTo(controls.getObject().position) < CATCHOFFSET) {
        caught()
    } else {
        animateDino(delta)
        animatePlayer(delta)
    }
}

function animateDino(delta) {
    dinoVelocity.x -= dinoVelocity.x * 10.0 * delta
    dinoVelocity.z -= dinoVelocity.z * 10.0 * delta

    if(detectDinoCollision() == false) {
        dinoVelocity.z += DINOSPEED * delta
        dino.translateZ(dinoVelocity.z * delta)
    } else {
        var directionMultiples = [-1, 1, 2]
        var randomIndex = getRandomInt(0, 2)
        var randomDirection = degreesToRadians(90 * directionMultiples[randomIndex])

        dinoVelocity.z += DINOSPEED * delta
        dino.rotation.y += randomDirection
    }
}

function animatePlayer(delta) {
    playerVelocity.x -= playerVelocity.x * 10.0 * delta
    playerVelocity.z -= playerVelocity.z * 10.0 * delta

    if(detectPlayerCollision() == false) {
        if (moveForward) {
            playerVelocity.z -= PLAYERSPEED * delta
        } 
        if (moveBackward) {
            playerVelocity.z += PLAYERSPEED * delta
        } 
        if (moveLeft) {
            playerVelocity.x -= PLAYERSPEED * delta
        } 
        if (moveRight) {
            playerVelocity.x += PLAYERSPEED * delta
        }
        
        controls.getObject().translateX(playerVelocity.x * delta)
        controls.getObject().translateZ(playerVelocity.z * delta)
    } else {
        playerVelocity.x = 0
        playerVelocity.z = 0
    }
}

function render() {
    renderer.render(scene, camera)
}

function degreesToRadians(degrees) {
    return degrees * Math.PI / 180
}

function radiansToDegrees(radians) {
    return radians * 180 / Math.PI
}

function detectPlayerCollision() {
    var rotationMatrix
    var cameraDirection = controls.getDirection(new THREE.Vector3(0, 0, 0)).clone()

    if(moveBackward) {
        rotationMatrix = new THREE.Matrix4()
        rotationMatrix.makeRotationY(degreesToRadians(180))
    } else if (moveLeft) {
        rotationMatrix = new THREE.Matrix4()
        rotationMatrix.makeRotationY(degreesToRadians(90))
    } else if (moveRight) {
        rotationMatrix = new THREE.Matrix4()
        rotationMatrix.makeRotationY(degreesToRadians(270))
    }

    if(rotationMatrix !== undefined) {
        cameraDirection.applyMatrix4(rotationMatrix)
    }

    var rayCaster = new THREE.Raycaster(controls.getObject().position, cameraDirection)

    if(rayIntersect(rayCaster, PLAYERCOLLISIONDISTANCE)) {
        return true
    } else {
        return false
    }
}

function detectDinoCollision() {
    var matrix = new THREE.Matrix4()
    matrix.extractRotation(dino.matrix)

    var directionFront = new THREE.Vector3(0, 0, 1)

    directionFront.applyMatrix4(matrix)

    var rayCasterF = new THREE.Raycaster(dino.position, directionFront)
    if(rayIntersect(rayCasterF, DINOCOLLISIONDISTANCE)) {
        return true
    } else {
        return false
    }
}

function rayIntersect(ray, distance) {
    var intersects = ray.intersectObjects(collidableObjects)
    for (var i = 0; i < intersects.length; i++) {
        if(intersects[i].distance < distance) {
            return true
        }
    }
    return false
}

function lockChange() {
    if(document.pointerLockElement === container) {
        blocker.style.display = "none"
        controls.enabled = true
    } else {
        if (gameOver) {
            location.reload()
        }
        blocker.style.display = ""
        controls.enabled = false
    }
}

/*------LABIRINTO---------*/

function createMazeCubes() {
    var map = [
        [0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, ],
        [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, ],
        [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, ],
        [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, ],
        [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, ],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, ],
        [1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, ],
        [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, ],
        [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ],
        [0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, ],
        [0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, ],
        [0, 2, 2, 2, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, ],
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, ],
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, ],
        [1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, ],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ],
        [1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, ],
        [0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, ],
        [0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, ]
    ]

    var cubeGeo = new THREE.BoxGeometry(UNITWIDTH, UNITHEIGHT, UNITWIDTH)
    var cubeMat = new THREE.MeshPhongMaterial({
        color: 0x81cfe0
    })

    var widthOffset = UNITWIDTH / 2
    var heightOffset = UNITHEIGHT / 2

    totalCubesWide = map[0].length

    for (var i = 0; i < totalCubesWide; i++) {
        for(var j = 0; j < map[i].length; j++) {
            if(map[i][j]) {
                if(map[i][j] == 1) {
                    var cube = new THREE.Mesh(cubeGeo, cubeMat)

                    cube.position.z = (i - totalCubesWide / 2) * UNITWIDTH + widthOffset
                    cube.position.y = heightOffset
                    cube.position.x = (j - totalCubesWide / 2) * UNITWIDTH + widthOffset

                    scene.add(cube)

                    collidableObjects.push(cube)
                } else if (map[i][j] == 2) {
                    /*var cube = new THREE.Mesh(new THREE.BoxGeometry(UNITWIDTH, UNITHEIGHT, UNITWIDTH), new THREE.MeshPhongMaterial({ color: 0x000000 }))

                    cube.position.z = (i - totalCubesWide / 2) * UNITWIDTH + widthOffset
                    cube.position.y = heightOffset
                    cube.position.x = (j - totalCubesWide / 2) * UNITWIDTH + widthOffset
                    */

                    loader.load('./models/egg.gltf', function (gltf) {
                        scene.add(gltf.scene)
                        collidableObjects.push(gltf.scene)
                    }, undefined, function (error) {
                        console.error(error)
                    })
                    //scene.add(cube)

                    //collidableObjects.push(cube)
                }
            }
        }
    }

    mapSize = totalCubesWide * UNITWIDTH
}

function createGround() {
    var groundGeo = new THREE.PlaneGeometry(mapSize, mapSize)
    var groundMat = new THREE.MeshPhongMaterial({ color: 0xA0522D, side: THREE.DoubleSide, shading: THREE.FlatShading })

    var ground = new THREE.Mesh(groundGeo, groundMat)
    ground.position.set(0, 1, 0)
    ground.rotation.x = degreesToRadians(90)
    scene.add(ground)
}

function createPerimWalls() {
    var halfMap = mapSize/2
    var sign = 1

    for (var i = 0; i < 2; i++) {
        var perimGeo = new THREE.PlaneGeometry(mapSize, UNITHEIGHT)
        var perimMat = new THREE.MeshPhongMaterial({ color: 0x464646, side: THREE.DoubleSide})
        var perimWallLR = new THREE.Mesh(perimGeo, perimMat)
        var perimWallFB = new THREE.Mesh(perimGeo, perimMat)

        perimWallLR.position.set(halfMap * sign, UNITHEIGHT / 2, 0)
        perimWallLR.rotation.y = degreesToRadians(90)
        scene.add(perimWallLR)

        collidableObjects.push(perimWallLR)

        perimWallFB.position.set(0, UNITHEIGHT / 2, halfMap * sign)
        scene.add(perimWallFB)

        collidableObjects.push(perimWallFB)

        sign = -1
    }
}

function getPointerLock() {
    document.onclick = function() {
        container.requestPointerLock()
    }
    document.addEventListener('pointerlockchange', lockChange, false)
}

function lockChange() {
    if(document.pointerLockElement === container) {
        blocker.style.display = "none"
        controls.enabled = true
    } else {
        blocker.style.display = ""
        controls.enabled = false
    }
}

function listenForPlayerMovement() {
    var onKeyDown = function(event) {
        switch(event.keyCode) {
            case 38: //up
            case 87: // W
                moveForward = true
                break
            case 37: //left
            case 65: // A
                moveLeft = true
                break
            case 40: //down
            case 83: // S
                moveBackward = true
                break
            case 39: //right
            case 68: // D
                moveRight = true
                break
        }
    }

    var onKeyUp = function(event) {
        switch(event.keyCode) {
            case 38: //up
            case 87: // W
                moveForward = false
                break
            case 37: //left
            case 65: // A
                moveLeft = false
                break
            case 40: //down
            case 83: // S
                moveBackward = false
                break
            case 39: //right
            case 68: // D
                moveRight = false
                break
        }
    }

    document.addEventListener('keydown', onKeyDown, false)
    document.addEventListener('keyup', onKeyUp, false)
}