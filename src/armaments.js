import body from "./body.js"
import vec from "./vector.js"
import projectile from "./projectile.js"

const Laser = projectile.Laser

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

        this.target = null
    }

    process(dt, t) {
        // stay bound
        this.pos = this.parent.pos.clone().add(this.bind_pos.clone().rotate(this.parent.rot))
    }

    contains(body) {
        return body == this.parent || body == this || body in this.parent.armaments
    }
}


class DualLaser extends Armament {
    constructor(universe, parent, bind_pos, faction) {
        super(universe, parent, bind_pos, faction)
        this.color = "#20BB20" // TODO: vary by faction

        this.rot_speed = Math.PI * 2
        this.shot_delay = 0.3
        this.laser_color = CYAN
        this.laser_speed_boost = 500
        
        this.barrel_length = this.radius * 1.5

        this.last_laser_shot = 0
        this.shot_delay = 0.3
    }

    draw(context) {
        super.draw(context)

        // draw gun barrels
        // TODO: draw two of them
        let v = vec(this.radius * 0.25, 0).rotate(this.rot + Math.PI)
        let p1 = this.pos.clone().add(v)
        let p2 = this.pos.clone().subtract(v)
        let end1 = p1.clone().add(vec(this.barrel_length, 0).rotate(this.rot - Math.PI * 0.5))
        let end2 = p2.clone().add(vec(this.barrel_length, 0).rotate(this.rot - Math.PI * 0.5))

        this.universe.draw_line(context, "#303030", p1, end1, 3)
        this.universe.draw_line(context, "#303030", p2, end2, 3)
    }

    process(dt, t) {
        super.process(dt, t)

        let closest = null
        let closest_distance = 10000000
        this.universe.bodies.forEach(body => {
            if (closest === null) {
                closest = body
            }
            let need_continue = false
            if (body.type != "fighter") need_continue = true
            else if (body == this.parent || body.faction === this.parent.faction || body.hp <= 0) need_continue = true

            if (!need_continue) {
                let distance_sq = this.pos.distanceSq(body.pos)
                if (distance_sq < closest_distance) {
                    closest_distance = distance_sq
                    closest = body
                }
            }
        })

        this.target = closest

        if (this.rot < 0) this.rot += 360
        else if (this.rot > 360) this.rot %= 360

        let time = this.target.pos.distance(this.pos) / (this.parent.vel.length() + 500)
        let projection = this.target.pos.clone().add(this.target.vel.scaled(time))

        let desired_angle = vec(0, 1).angle() + projection.subtract(this.pos).angle()
        let desired_rotation = desired_angle - this.rot

        if (desired_rotation < 0) desired_rotation += 2 * Math.PI
        else if (desired_rotation > 2 * Math.PI) desired_rotation -= 2 * Math.PI

        // rotate as much as possible (TODO: fix this)
        let max_rotation_amount = this.rot_speed * dt
        if (max_rotation_amount > desired_rotation) {
            this.rot += desired_rotation
        } else {
            this.rot += max_rotation_amount
        }

        this.fire_laser(t)
    }

    fire_laser(t) {
        if (t - this.last_laser_shot > this.shot_delay) {
            this.last_laser_shot = t
            let l = new Laser(this.universe, this, this.pos, this.laser_color, 3)
            l.vel = vec(0, this.parent.vel.length() + 500).invert().rotate(this.rot) // TODO: add spread
        }
    }
}

export default {
    DualLaser
}