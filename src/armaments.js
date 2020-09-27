import body from "./body.js"
import vec from "./vector.js"
import projectile from "./projectile.js"

const CYAN = "#00FFFF"

class Armament extends body.CircularBody {
    constructor(universe, parent, bind_pos, faction) {
        let pos = parent.pos.clone()
        pos.add(bind_pos)
        super(universe, pos, faction, 10)

        this.parent = parent
        this.bind_pos = bind_pos

        this.hp = 100
        this.rot = 0

        // changed by children
        this.rot_speed = 0

        // set rotation boundaries by finding angle of line
        
    }

    process(dt, t) {
        // stay bound
        this.pos = this.parent.pos.clone().add(this.bind_pos)
    }
}


class DualLaser extends Armament {
    constructor(universe, parent, bind_pos, faction) {
        super(universe, parent, bind_pos, faction)

        this.rot_speed = Math.PI * 2
        this.shot_delay = 0.3
        this.laser_color = CYAN
        this.laser_speed_boost = 500
        
        this.barrel_length = this.radius * 2
    }

    draw(context) {
        super.draw(context)

        // draw gun barrels
        // TODO: draw two of them
        let end = this.pos.clone().add(vec(this.barrel_length, 0).rotate(this.rot))
        this.universe.draw_line(context, this.faction, this.pos, end, 3)
    }
}

export default {
    DualLaser
}