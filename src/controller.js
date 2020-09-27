class Controller {
    constructor() {
        this.keys = {}

        this.left = "ArrowLeft"
        this.right = "ArrowRight"
        this.up = "ArrowUp"
        this.down = "ArrowDown"

        this.control_schemes = {
            "Arrows": () => {this.set_arrow()},
            "WASD": () => {this.set_wasd()},
            "IJKL": () => {this.set_ijkl()}
        }
        
        this.fire = "Space"

        document.addEventListener("keydown", (e) => this.log_keydown(e))
        document.addEventListener("keyup", (e) => this.log_keyup(e))
    }

    update() {
        const e = document.getElementById("control-set")
        const set_controls = e.options[e.selectedIndex].value
        this.set_controls(set_controls)
    }

    set_arrow() {
        this.left = "ArrowLeft"
        this.right = "ArrowRight"
        this.up = "ArrowUp"
        this.down = "ArrowDown"
    }

    set_wasd() {
        this.left = "KeyA"
        this.right = "KeyD"
        this.up = "KeyW"
        this.down = "KeyS"
    }

    set_ijkl() {
        this.left = "KeyJ"
        this.right = "KeyL"
        this.up = "KeyI"
        this.down = "KeyK"
    }

    get_control_setting() {
        return this.control_setting_names[this.control_setting]
    }

    set_controls(control_scheme_string) {
        this.control_schemes[control_scheme_string]()
    }

    log_keydown(e) {
        this.keys[e.code] = true
    }

    log_keyup(e) {
        console.log(e.code)
        this.keys[e.code] = false
    }

    pressed(key_code) {
        if (this.keys[key_code] == undefined) {
            return false
        }
        else {
            return this.keys[key_code]
        }
    }
    
}

export default Controller