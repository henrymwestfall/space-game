class Rect {
	constructor(x, y, width, height) {
		// x and y coordinates on the canvas
		this.x = x;
		this.y = y;

		// width and height of the rectangle
		this.width = width;
		this.height = height;
	}

	move_to(x, y) {
		this.x = x;
		this.y = y;
	}

	// methods that return positions of parts of the rectangle
	// these methods also can be used as setters

	get_centerx() {
		return this.x + this.width / 2;
	}

	set_centerx(value) {
		this.x = value - this.width / 2;
	}

	get_centery() {
		return this.y + this.height / 2;
	}

	set_centery(value) {
		this.y = value - this.height / 2;
	}

	get_center() {
		const center_point = [this.centerx(), this.centery()];
		return center_point;
	}

	set_center(x, y) {
		this.set_centerx(x);
		this.set_centery(y);
	}

	get_top() {
		return this.y;
	}

	set_top(value) {
		this.y = value;
	}

	get_bottom(set=null) {
		return this.y + this.height;
	}

	set_bottom(value) {

		this.y = value - this.height;
	}

	get_left() {
		return this.x;
	}

	set_left(value) {
		this.x = value;
	}

	get_right() {
		return this.x + this.width;
	}

	set_right(value) {
		this.x = value - this.width;
	}

	collides_with(rectangle) {
	}

	frame(image) {
		this.width = image.width;
		this.height = image.height;
	}

	// collision detection
	collides_with(rectangle) {
		if (rectangle.get_top() <= this.get_top() && this.get_top() <= rectangle.get_bottom()) {
			if (rectangle.get_left() <= this.get_left() && this.get_left() <= rectangle.get_right()) {
				return true;
			}
			if (rectangle.get_left() <= this.get_right() && this.get_right() <= rectangle.get_right()) {
				return true;
			}
		}
		return false;
	}

	collide_point(point) {
		// point must have x and y attributes
		if (this.get_top() <= point.y && point.y <= this.get_bottom()) {
			if (this.get_left() <= point.x && point.x <= this.get_right()) {
				return true;
			}
		}
		return false;
	}
}

export default Rect