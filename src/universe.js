import vec from "./vector.js"


class Universe {
    constructor() {
        this.bodies = []
        this.particles = []
        this.zoom = 1
        this.zoom_speed = 0.5
        this.camera = vec(0, 0)
        this.focus = null

        this.background = []
        for (let i=0; i<2500; ++i) {
            let pos = vec(Math.round(Math.random() * 40000 - 20000), Math.round(Math.random() * 40000 - 20000))
            this.background.push([pos, Math.random() * 0.5])
        }
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

        this.bodies.forEach(b => {
            b.draw(context)
        })
        
        this.background.forEach(pos => {
            let rp = this.get_render_point(pos[0], pos[1])
            if (rp.x < 1000 && rp.x > -100 && rp.y < 700 && rp.y > -100) {
                this.draw_circle(context, "#FFFFFF", pos[0], 2, pos[1])
            }
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

    draw_circle(context, color, global_center, radius, parallax=1) {
        let render_center = this.get_render_point(global_center, parallax)
        context.fillStyle = color
        context.beginPath()
        context.arc(render_center.x, render_center.y, Math.max(radius * this.zoom, 1), 0, 2 * Math.PI)
        context.fill()
    }

    get_render_point(point, parallax=1) {
        return point.clone().subtract(this.camera).scaled(this.zoom * parallax)
    }
}

export default Universe