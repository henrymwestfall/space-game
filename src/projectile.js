import body from "./body.js"
import vec from "./vector.js"

const ORANGE = "#FFA600"

class Laser extends body.CircularBody {
    constructor(universe, parent, pos, color, radius) {
        super(universe, pos, color, radius)
        this.parent = parent

        this.length = 15 * this.radius

        this.exploding = false
        this.exploding_start = null
        this.explosion_life = 0.2

        this.full_life_length = 1.5

        this.first_position = null
    }

    process(dt, t) {
        if (dt == this.lifetime) {
            this.first_position = this.pos.clone()
        }

        if (this.exploding && t - this.exploding_start > this.explosion_life) {
            return true
        }

        if (this.lifetime > dt) {
            this.universe.get_nearby_bodies(this).forEach(body => {
                if ((typeof body.hp !== 'undefined') && body.get_aabb_rect().collide_point(this.pos) && !this.parent.contains(body)) {
                    if (body.radius_collision(this.pos)) {
                        this.exploding = true
                        this.exploding_start = t
                        this.vel.rotate(Math.random() * Math.PI * 0.25)
                        this.full_life_length = this.lifetime + 0.5
                        body.hp -= 10
                        this.color = ORANGE
                        this.parent = body
                    }
                }
            })

            if (this.lifetime >= this.full_life_length) {
                return true
            }
        }
    }

    draw(context) {
        if (this.exploding) {
            this.universe.draw_circle(context, this.color, this.pos, this.radius * 3)
        } else {
            this.universe.draw_circle(context, this.color, this.pos, this.radius) 
            // draw streak
            const streak_end = this.vel.clone().norm().invert().scaled(this.length).add(this.pos)
            const lerp_amount = 0.3

            if (this.first_position != null) {
                for (let i=0; i<this.length; ++i) {
                    let streak_to_original = this.first_position.clone().subtract(streak_end).norm()
                    let pos_to_original = this.first_position.clone().subtract(this.pos).norm()
                    if (streak_to_original.dot(pos_to_original) == 1 || this.lifetime > this.length / this.vel.length()) {
                        this.universe.draw_circle(context, this.color, streak_end, this.radius)
                    }
                    streak_end.mix(this.pos, lerp_amount)
                }
            }
        }
    }
}

export default {
    Laser
}