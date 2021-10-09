// // Needed for all mixins
// type Constructor<T = {}> = new (...args: any[]) => T;

// ////////////////////
// // Example mixins
// ////////////////////

// // A mixin that adds a property
// function Selectable<TBase extends Constructor>(Base: TBase) {
//   return class extends Base {
//     isSelected = false;

//     select() {
//         this.isSelected = true;
//     }

//     deselect() {
//         this.isSelected = true;
//     }
//   };
// }

class Selectable {
    isSelected = false;

    select() {
        this.isSelected = true;
    }

    deselect() {
        this.isSelected = true;
    }
};

class Health {
    health = 0;
}

export interface Building extends Selectable, Health {

}

export class Building extends Phaser.GameObjects.Image {

    /**
     * 
     * @param scene The Scene to which this Game Object belongs. A Game Object can only belong to one Scene at a time.
     * @param x The horizontal position of this Game Object in the world.
     * @param y The vertical position of this Game Object in the world.
     * @param texture The key, or instance of the Texture this Game Object will use to render with, as stored in the Texture Manager.
     * @param frame An optional frame from the Texture this Game Object is rendering with.
     */
    constructor(scene: Phaser.Scene, x: number, y: number, texture: string | Phaser.Textures.Texture, frame?: string | number) {
        super(scene, x, y, texture, frame);
    }
}