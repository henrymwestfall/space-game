import body from "./body.js"
import vec from "./vector.js"
import projectile from "./projectile.js"

const Laser = projectile.Laser

const CYAN = "#00FFFF"

class Armament extends body.CircularBody {
    constructor(universe, parent, bind_pos, bind_angle, faction) {
        let pos = parent.pos.clone()
        pos.add(bind_pos)
        super(universe, pos, faction, 20)

        this.parent = parent
        this.bind_pos = bind_pos
        this.bind_angle = bind_angle

        this.hp = 100
        this.rot = bind_angle - this.parent.rot

        // changed by children
        this.rot_speed = 0

        this.target = null
        this.type = "armament"
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
    constructor(universe, parent, bind_pos, bind_angle, faction) {
        super(universe, parent, bind_pos, bind_angle, faction)
        //this.color = "#20BB20" // TODO: vary by faction

        this.rot_speed = Math.PI / 3
        this.rot_range = Math.PI * 0.5

        this.min_angle = this.bind_angle - this.rot_range / 2 - Math.PI * 0.5
        this.max_angle = this.bind_angle + this.rot_range / 2 - Math.PI * 0.5

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

        this.universe.draw_line(context, "#606060", p1, end1, 3)
        this.universe.draw_line(context, "#606060", p2, end2, 3)

        // let proj1 = vec(50, 0).rotate(this.parent.rot + this.min_angle).add(this.pos)
        // let proj2 = vec(50, 0).rotate(this.parent.rot + this.max_angle).add(this.pos)
        // let proj3 = vec(30, 0).rotate(this.rot - Math.PI * 0.5).add(this.pos)

        // this.universe.draw_line(context, "#FF0000", this.pos, proj1, 2)
        // this.universe.draw_line(context, "#0000FF", this.pos, proj2, 2)
        // this.universe.draw_line(context, "#00FFFF", this.pos, proj3, 2)
    }

    process(dt, t) {
        super.process(dt, t)
        if (this.hp <= 0) {
            this.hp = 0
            this.color = "#FFa500"
            this.vel.mix(vec(0, 0), this.dec * dt)
            return false // do not kill self
        }

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

        let time = this.target.pos.distance(this.pos) / (this.parent.vel.length() + 500)
        let projection = this.target.pos.clone().add(this.target.vel.scaled(time))

        let desired_angle = vec(0, 1).angle() + projection.subtract(this.pos).angle()
        desired_angle %= Math.PI * 2
        let desired_rotation = desired_angle - this.rot

        // rotate as much as possible (TODO: fix this)
        let max_rotation_amount = this.rot_speed * dt
        if (max_rotation_amount >= Math.abs(desired_rotation)) {
            this.rot += desired_rotation
        } else {
            this.rot += max_rotation_amount * Math.sign(desired_rotation)
        }
        this.rot %= Math.PI * 2

        let min = this.min_angle + this.parent.rot + Math.PI * 0.5
        let max = this.max_angle + this.parent.rot + Math.PI * 0.5

        if (this.rot > max) {
            this.rot = max
        } else if (this.rot < min) {
            this.rot = min
        }

        // let shifted = this.rot % (Math.PI * 2)
        // if (shifted < min) {
        //     this.rot = min
        // }
        // else if (shifted > max) {
        //     console.log(shifted, max)
        //     this.rot = max
        // }

        if (desired_rotation < this.rot_range / 2 && this.target.hp > 0) {
            this.fire_laser(t)
        }
    }

    fire_laser(t) {
        if (t - this.last_laser_shot > this.shot_delay) {
            let v = vec(this.radius * 0.25, 0).rotate(this.rot + Math.PI)
            let p1 = this.pos.clone().add(v)
            let p2 = this.pos.clone().subtract(v)
            this.last_laser_shot = t
            let l = new Laser(this.universe, this, p1, this.laser_color, 2)
            l.vel = vec(0, this.parent.vel.length() + 500).invert().rotate(this.rot) // TODO: add spread
            let l2 = new Laser(this.universe, this, p2, this.laser_color, 2)
            l2.vel = vec(0, this.parent.vel.length() + 500).invert().rotate(this.rot) // TODO: add spread
            
        }
    }
}

export default {
    DualLaser
}