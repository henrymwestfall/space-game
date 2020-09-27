import vec from "./vector.js"
import body from "./body.js"


class Universe {
    constructor() {
        this.bodies = []
        this.particles = []
        this.zoom = 1
        this.zoom_speed = 0.5
        this.camera = vec(0, 0)
        this.focus = null

        this.chunks = {}
        this.chunk_size = 500

        this.background = []
        for (let i=0; i<2500; ++i) {
            let pos = vec(Math.round(Math.random() * 40000 - 20000), Math.round(Math.random() * 40000 - 20000))
            this.background.push([pos, Math.random() * 0.5])
        }
    }

    remove_body(body) {
        const index = this.bodies.indexOf(body);
        if (index > -1) {
            this.bodies.splice(index, 1);
        }
    }

    zero_adjusted(pos) {
        const zero_adjusted = pos.clone()
        if (pos.x == 0) {
            zero_adjusted.x = 1
        }
        if (pos.y == 0) {
            zero_adjusted.y = 1
        }
        return zero_adjusted
    }

    chunk_key(pos) {
        const zero_adjusted = this.zero_adjusted(pos)
        return `${Math.floor(zero_adjusted.x / this.chunk_size)};${Math.floor(zero_adjusted.y / this.chunk_size)}`
    }

    adjacent_chunk_keys(pos, reach=1) {
        const zero_adjusted = this.zero_adjusted(pos)
        const main_chunk_pos = vec(Math.floor(zero_adjusted.x / this.chunk_size), Math.floor(zero_adjusted.y / this.chunk_size))
        const keys = []
        for (let dx=-reach; dx<reach; ++dx) {
            for (let dy=-reach; dy<reach; ++dy) {
                const chunk_pos = vec(main_chunk_pos.x + dx, main_chunk_pos.y +dy)
                keys.push(`${chunk_pos.x};${chunk_pos.y}`)
            }
        }
        return keys
    }

    update_chunk_for(e) {
        const key = this.chunk_key(e.pos)
        if (key === e.chunk) {
            return e.chunk
        } else if (key in this.chunks && e.chunk in this.chunks) {
            this.chunks[key].push(e)
            const index = this.chunks[e.chunk].indexOf(e)
            this.chunks[e.chunk].splice(index, 1)
        } else if (key in this.chunks) {
            this.chunks[key].push(e)
        } else {
            this.chunks[key] = [e]
        }
        return key
    }

    get_nearby_bodies(e, reach=1) {
        const keys = this.adjacent_chunk_keys(e.pos, reach)
        const bodies = []
        keys.forEach(key => {
            if (key in this.chunks) {
                this.chunks[key].forEach(body => {
                    bodies.push(body)
                })
            }
        })
        return bodies
    }

    update(dt, t) {
        if (self.focus != null) {
            this.camera = this.focus.pos.clone().subtract(vec(450, 300).scaled(1 / this.zoom))
            if (this.focus.vel.length() > 900) {
                this.zoom = vec(this.zoom, 0).mix(vec(0.3, 0), this.zoom_speed * dt).x
            }
            else if (this.focus.vel.length() > 200) {
                this.zoom = vec(this.zoom, 0).mix(vec(0.5, 0), this.zoom_speed * dt).x
            }
            else {
                this.zoom = vec(this.zoom, 0).mix(vec(1, 0), this.zoom_speed * dt).x
            }
        }

        // update children
        this.bodies.forEach(b => {
            b.update(dt, t)
        })
    }

    render(context) {
        context.fillStyle = "#000000"
        context.fillRect(0, 0, 900, 600)

        this.background.forEach(pos => {
            let rp = this.get_render_point(pos[0], pos[1])
            if (rp.x < 1000 && rp.x > -100 && rp.y < 700 && rp.y > -100) {
                this.draw_circle(context, "#FFFFFF", pos[0], 2, pos[1])
            }
        })
        
        this.bodies.forEach(b => {
            b.draw(context)
        })
    }

    draw_poly(context, color, global_points, parralax=1) {
        context.fillStyle = color
        let s = this.get_render_point(global_points[0])
        context.beginPath()
        context.moveTo(s.x, s.y)
        global_points.forEach(p => {
            let rp = this.get_render_point(p)
            context.lineTo(rp.x, rp.y)
        })
        context.fill()
    }

    draw_circle(context, color, global_center, radius, parallax=1, fill=true) {
        let render_center = this.get_render_point(global_center, parallax)
        context.fillStyle = color
        context.strokeStyle = color
        context.beginPath()
        context.arc(render_center.x, render_center.y, Math.max(radius * this.zoom, 1), 0, 2 * Math.PI)
        if (fill) context.fill()
        else context.stroke()
    }

    draw_line(context, color, start, end, width, parallax=1) {
        context.strokeStyle = color
        context.lineWidth = width
        context.beginPath()
        let start_render = this.get_render_point(start, parallax)
        let end_render = this.get_render_point(end, parallax)
        context.moveTo(start_render.x, start_render.y)
        context.lineTo(end_render.x, end_render.y)
        context.stroke()
    }

    get_render_point(point, parallax=1) {
        return point.clone().subtract(this.camera).scaled(this.zoom * parallax)
    }
}

export default Universe