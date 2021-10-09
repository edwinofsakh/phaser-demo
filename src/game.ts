import 'phaser';
import * as dat from 'dat.gui';
import './socket';

let gVersion = 'v0.0.1';

let gTarget: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);

let gCursor = {
    tile: new Phaser.Math.Vector2(0, 0),
    world: new Phaser.Math.Vector2(0, 0)
};

let gTiles = {
    ground: 0,
    grid: 0,
    objects: 0,
};

class FPSBuffer {
    private array: number[];
    private pointer: number;
    readonly length: number;

    constructor(n: number) {
        this.array = new Array(n).fill(0);
        this.length = n;
        this.pointer = 0;
    }

    push(value: number) {
        this.array[this.pointer] = value;
        this.pointer = (this.pointer + 1) % this.length;
        return value;
    }

    average() {
        return this.array.reduce(function (a, b) { return a + b; }, 0) / this.length;
    }
}

let gFpsBuffer = new FPSBuffer(10);

class Skeleton extends Phaser.GameObjects.Image {
    startX: number;
    startY: number;
    distance: number;
    motion: string;
    anim: any;
    direction: any;
    speed: number;
    f: any;

    static anims = {
        idle: {
            startFrame: 0,
            endFrame: 4,
            speed: 0.2
        },
        walk: {
            startFrame: 4,
            endFrame: 12,
            speed: 0.15
        },
        attack: {
            startFrame: 12,
            endFrame: 20,
            speed: 0.11
        },
        die: {
            startFrame: 20,
            endFrame: 28,
            speed: 0.2
        },
        shoot: {
            startFrame: 28,
            endFrame: 32,
            speed: 0.1
        }
    };

    static directions = {
        west: { offset: 0, x: -2, y: 0, opposite: 'east' },
        northWest: { offset: 32, x: -2, y: -1, opposite: 'southEast' },
        north: { offset: 64, x: 0, y: -2, opposite: 'south' },
        northEast: { offset: 96, x: 2, y: -1, opposite: 'southWest' },
        east: { offset: 128, x: 2, y: 0, opposite: 'west' },
        southEast: { offset: 160, x: 2, y: 1, opposite: 'northWest' },
        south: { offset: 192, x: 0, y: 2, opposite: 'north' },
        southWest: { offset: 224, x: -2, y: 1, opposite: 'northEast' }
    };

    constructor(scene, x, y, motion, direction, distance) {
        super(scene, x, y, 'skeleton', direction.offset);

        this.startX = x;
        this.startY = y;
        this.distance = distance;

        this.motion = motion;
        this.anim = Skeleton.anims[motion];
        this.direction = Skeleton.directions[direction];
        this.speed = 0.15;
        this.f = this.anim.startFrame;

        this.depth = y + 64;

        this.scene.time.delayedCall(this.anim.speed * 1000, this.changeFrame, [], this);
    }

    changeFrame() {
        this.f++;

        var delay = this.anim.speed;

        if (this.f === this.anim.endFrame) {
            switch (this.motion) {
                case 'walk':
                    this.f = this.anim.startFrame;
                    this.frame = this.texture.get(this.direction.offset + this.f);
                    this.scene.time.delayedCall(delay * 1000, this.changeFrame, [], this);
                    break;

                case 'attack':
                    delay = Math.random() * 2;
                    this.scene.time.delayedCall(delay * 1000, this.resetAnimation, [], this);
                    break;

                case 'idle':
                    delay = 0.5 + Math.random();
                    this.scene.time.delayedCall(delay * 1000, this.resetAnimation, [], this);
                    break;

                case 'die':
                    delay = 6 + Math.random() * 6;
                    this.scene.time.delayedCall(delay * 1000, this.resetAnimation, [], this);
                    break;
            }
        }
        else {
            this.frame = this.texture.get(this.direction.offset + this.f);

            this.scene.time.delayedCall(delay * 1000, this.changeFrame, [], this);
        }
    }

    resetAnimation() {
        this.f = this.anim.startFrame;

        this.frame = this.texture.get(this.direction.offset + this.f);

        this.scene.time.delayedCall(this.anim.speed * 1000, this.changeFrame, [], this);
    }

    update() {
        if (this.motion === 'walk') {
            this.x += this.direction.x * this.speed;

            if (this.direction.y !== 0) {
                this.y += this.direction.y * this.speed;
                this.depth = this.y + 64;
            }

            //  Walked far enough?
            if (Phaser.Math.Distance.Between(this.startX, this.startY, this.x, this.y) >= this.distance) {
                this.direction = Skeleton.directions[this.direction.opposite];
                this.f = this.anim.startFrame;
                this.frame = this.texture.get(this.direction.offset + this.f);
                this.startX = this.x;
                this.startY = this.y;
            }
        }
    }
}

export default class GameScene extends Phaser.Scene {
    controls: any;
    uiPosText: any;
    selection: {
        from: Phaser.Math.Vector2,
        to: Phaser.Math.Vector2,
        polygon: Phaser.GameObjects.Polygon | null
    };
    
    buildings: string[];

    units: Phaser.GameObjects.Image[] = [];

    gridLayer: Phaser.Tilemaps.TilemapLayer;

    ctrl: Phaser.Input.Keyboard.Key;

    constructor() {
        super('demo');
        this.units = [];
    }

    preload() {
        this.load.image('ground-tiles', 'assets/grass-and-water.png');
        this.load.image('object-tiles', 'assets/test-objects.png');
        this.load.tilemapTiledJSON('tilemap', 'assets/grass-and-water-map.json');
        this.load.spritesheet('skeleton', 'assets/skeleton.png', { frameWidth: 128, frameHeight: 128 });
        this.load.image('house', 'assets/house.png');
    }

    private getDiamondPoints(x: number, y: number): number[] {
        const a = 32;
        const b = 16;

        return [
            0, 0,
            x * a, x * b,
            (x - y) * a, (x + y) * b,
            y * -a, y * b
        ];
    }

    create() {
        this.selection = {
            from: new Phaser.Math.Vector2(0, 0),
            to: new Phaser.Math.Vector2(0, 0),
            polygon: null
        };

        this.ctrl = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);

        this.units.push(this.add.existing(new Skeleton(this, 240, 290, 'walk', 'southEast', 100)));
        this.units.push(this.add.existing(new Skeleton(this, 100, 380, 'walk', 'southEast', 230)));

        const house = this.add.image(240, 370, 'house');
        house.depth = house.y + 86;

        const map = this.make.tilemap({ key: 'tilemap' });
        const groundTileset = map.addTilesetImage('grass-and-water', 'ground-tiles');
        const objectTileset = map.addTilesetImage('test-objects', 'object-tiles');

        const groundLayer = map.createLayer('ground', groundTileset, 0, -16);
        this.gridLayer = map.createLayer('grid', objectTileset);
        this.gridLayer.forEachTile((tile) => {tile.setVisible(false)});

        const objectLayer = map.createLayer('objects', objectTileset);

        this.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
            const { worldX, worldY } = pointer;
            const target = this.gridLayer.worldToTileXY(worldX, worldY);
            console.log('up', target);
        });

        this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
            if (gTarget) {
                const prevTile = this.gridLayer.getTileAt(gTarget.x, gTarget.y);
                prevTile?.setVisible(false);
                // this.gridLayer.putTileAt(25, gTarget.x, gTarget.y);
            }

            const { worldX, worldY } = pointer;
            gCursor.world.x = worldX;
            gCursor.world.y = worldY;

            this.gridLayer.worldToTileXY(worldX, worldY, true, gTarget);
            gCursor.tile.x = gTarget.x;
            gCursor.tile.y = gTarget.y;

            const groundTile = groundLayer.getTileAt(gTarget.x, gTarget.y);
            const gridTile = this.gridLayer.getTileAt(gTarget.x, gTarget.y);
            const objectTile = objectLayer.getTileAt(gTarget.x, gTarget.y);

            gTiles.ground = groundTile?.index;
            gTiles.grid = gridTile?.index;
            gTiles.objects = objectTile?.index;

            // this.gridLayer.putTileAt(29, gTarget.x, gTarget.y);
            gridTile?.setVisible(true);

            if (this.ctrl.isDown && pointer.isDown) {
                const cam = this.cameras.main;
                cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
                cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
            }
        });

        this.controls = this.createControls();

        this.addDebugGUI();

        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.off(Phaser.Input.Events.POINTER_DOWN);
            this.input.off(Phaser.Input.Events.POINTER_MOVE);
            this.input.off(Phaser.Input.Events.POINTER_UP);
        });

        this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
        this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
        this.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    }

    update(time: number, delta: number) {
        void (time);
        
        this.units.forEach(function (skeleton) {
            skeleton.update();
        });

        this.controls.update(delta);
        gFpsBuffer.push(delta);
    }

    private handlePointerDown(pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) {
        this.selection.from.x = pointer.worldX;
        this.selection.from.y = pointer.worldY;
    }

    private handlePointerMove(pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) {
        if (!pointer.isDown) return;
        if (this.ctrl.isDown) return;

        this.selection.polygon?.destroy();
        this.selection.to.x = pointer.worldX;
        this.selection.to.y = pointer.worldY;

        const fromTile = this.gridLayer.worldToTileXY(this.selection.from.x, this.selection.from.y, true);
        const from = this.gridLayer.tileToWorldXY(fromTile.x, fromTile.y);
        const toTile = this.gridLayer.worldToTileXY(this.selection.to.x, this.selection.to.y, true);
        const dx = toTile.x - fromTile.x + 1;
        const dy = toTile.y - fromTile.y + 1;
        console.log(fromTile, toTile);
        console.log((toTile.x - fromTile.x), (toTile.y - fromTile.y));

        this.selection.polygon = this.add.polygon(from.x + 32, from.y, this.getDiamondPoints(dx, dy), 0x1d7196, 0.6);
        this.selection.polygon.setOrigin(0, 0);
        this.selection.polygon.setDepth(1000);

        // this.selection.polygon.setDisplayOrigin(0, 0);

        // const dx = pointer.prevPosition.x - pointer.worldX;
        // const dy = pointer.prevPosition.y - pointer.worldY;

        // this.selection.width += dx;
        // this.selection.height += dy;

        // // create a new Rectangle
        // const selectionRect = new Phaser.Geom.Rectangle(
        //     this.selection.x,
        //     this.selection.y,
        //     this.selection.width,
        //     this.selection.height
        // )

        // // check if width or height is negative
        // // and then adjust
        // if (selectionRect.width < 0)
        // {
        //     selectionRect.x += selectionRect.width
        //     selectionRect.width *= -1
        // }
        // if (selectionRect.height < 0)
        // {
        //     selectionRect.y += selectionRect.height
        //     selectionRect.height *= -1
        // }

        // use the new Rectangle to check for overlap
        // const selected = this.physics.overlapRect(
        //     selectionRect.x,
        //     selectionRect.y,
        //     selectionRect.width,
        //     selectionRect.height
        // )

        // console.log(selected);
    }

    private handlePointerUp(pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) {
        this.selection.from.x = 0;
        this.selection.from.y = 0;
        this.selection.to.x = 0;
        this.selection.to.y = 0;

        // Destroy previous selection polygon
        this.selection.polygon?.destroy();
    }

    private createControls() {
        // const cursors = this.input.keyboard.createCursorKeys();

        const controlConfig: Phaser.Types.Cameras.Controls.FixedKeyControlConfig = {
            camera: this.cameras.main,
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            zoomIn: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
            zoomOut: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
            speed: 1
            // acceleration: 0.06,
            // drag: 0.0005,
            // maxSpeed: 1.0
        };

        this.input.on(Phaser.Input.Events.DRAG_START, (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
            console.log('drag start', pointer, gameObject);
        });

        this.input.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
            console.log('drag', pointer, gameObjects);
        });

        this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
            // console.log('pointer move', pointer, gameObjects);
        });

        this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
            // console.log('pointer down', pointer, gameObjects);
        });

        this.input.on(Phaser.Input.Events.POINTER_WHEEL, (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number, deltaZ: number) => {
            let zoom = this.cameras.main.zoom - deltaY / 1000;
            this.cameras.main.zoom = Math.max(0.1, Math.min(2, zoom));
        }
        );

        return new Phaser.Cameras.Controls.FixedKeyControl(controlConfig);
    }

    private addDebugGUI() {
        const cam = this.cameras.main;

        const gui = new dat.GUI();

        const help = {
            moving: 'W, S, A, D or Ctrl + Mouse',
            zooming: 'Q, E or Mouse Wheel'
        }

        const f1 = gui.addFolder('Camera');
        f1.add(cam, 'x').listen();
        f1.add(cam, 'y').listen();
        f1.add(cam, 'scrollX').listen();
        f1.add(cam, 'scrollY').listen();
        f1.add(cam, 'rotation').min(0).step(0.01).listen();
        f1.add(cam, 'zoom', 0.1, 2).step(0.1).listen();
        f1.add(help, 'moving');
        f1.add(help, 'zooming');
        f1.open();

        const fCursor = gui.addFolder('Cursor');
        fCursor.open();

        const fWorldCursor = fCursor.addFolder('World');
        fWorldCursor.add(gCursor.world, 'x').listen();
        fWorldCursor.add(gCursor.world, 'y').listen();
        fWorldCursor.open();

        const fTileCursor = fCursor.addFolder('Tile');
        fTileCursor.add(gCursor.tile, 'x').listen();
        fTileCursor.add(gCursor.tile, 'y').listen();
        fTileCursor.open();

        const fSelection = gui.addFolder('Selection');
        fSelection.open();

        const fSelectionFrom = fSelection.addFolder('From');
        fSelectionFrom.add(this.selection.from, 'x').listen();
        fSelectionFrom.add(this.selection.from, 'y').listen();
        fSelectionFrom.open();

        const fSelectionTo = fSelection.addFolder('To');
        fSelectionTo.add(this.selection.to, 'x').listen();
        fSelectionTo.add(this.selection.to, 'y').listen();
        fSelectionTo.open();

        const fLayers = gui.addFolder('Layers');
        fLayers.add(gTiles, 'ground').listen();
        fLayers.add(gTiles, 'grid').listen();
        fLayers.add(gTiles, 'objects').listen();
        fLayers.open();
    }
}

class UIScene extends Phaser.Scene {
    fps: Phaser.GameObjects.Text;
    position: Phaser.GameObjects.Text;
    version: Phaser.GameObjects.Text;

    constructor() {
        super({ key: 'UIScene', active: true });
    }

    create() {
        const style: Phaser.Types.GameObjects.Text.TextStyle = { font: '16px Courier', color: '#00ff00' };
        this.fps = this.add.text(10, 10, '', style);
        this.position = this.add.text(10, 30, '', style);
        this.version = this.add.text(10, 50, gVersion, style);
    }

    update(time: number, delta: number) {
        void (time);
        void (delta);
        const d = gFpsBuffer.average();
        this.fps.setText(`FPS ${Math.floor(1000 / d)} (${Math.floor(d)}ms)`);
        this.position.setText(`x: ${gTarget.x}, y: ${gTarget.y}`);
    }
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    backgroundColor: '#125555',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }
        }
    },
    scale: {
        parent: 'game',
        mode: Phaser.Scale.RESIZE,
    },
    scene: [GameScene, UIScene]
};

const game = new Phaser.Game(config);