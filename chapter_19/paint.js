// Using ES6 syntax

elt = (name, attributes, ...theArgs) => {
  let node = document.createElement(name)

  if (attributes) {
    for (let attr in attributes) {
      if (attributes.hasOwnProperty(attr)) {
        node.setAttribute(attr, attributes[attr])
      }
    }
  }
  for (let i = 0; i < theArgs.length; i++) {
    let child = theArgs[i]
    if (typeof child == "string") {
      child = document.createTextNode(child)
    }
    node.appendChild(child)
  }
  return node
}

let controls = Object.create(null)

createPaint = parent => {
  let canvas = elt("canvas", {width: window.innerWidth * .98, height: window.innerHeight * .80})
  let cx = canvas.getContext("2d")
  let toolbar = elt("div", {class: "toolbar"})
  for (var name in controls) {
    toolbar.appendChild(controls[name](cx))
  }

  let panel = elt("div", {class: "picturepanel"}, canvas)
  parent.appendChild(elt("div", null, panel, toolbar))
}

let tools = Object.create(null)

controls.tool = cx => {
  let select = elt("select")
  for (let name in tools) {
    select.appendChild(elt("option", null, name))
  }

  cx.canvas.addEventListener("mousedown", () => {
    if (event.which == 1) {
      tools[select.value](event, cx)
      event.preventDefault()
    }
  })
  // try adding touchevents for mobile, too
  cx.canvas.addEventListener("touchstart", () => {
    if (event.which == 0) {
      tools[select.value](event, cx)
      event.preventDefault()
    }
  }, { passive: false})

  return elt("span", null, "Tool: ", select)
}

relativePos = (event, element) => {
  let rect = element.getBoundingClientRect()
  if (event.which == 0) {
    return {x: Math.floor(event.changedTouches[0].clientX - rect.left),
            y: Math.floor(event.changedTouches[0].clientY - rect.top)}
  } else if (event.which == 1) {
    return {x: Math.floor(event.clientX - rect.left),
            y: Math.floor(event.clientY - rect.top)}
  }
}

trackDrag = (onMove, onEnd) => {
  end = event => {
    removeEventListener("mousemove", onMove)
    removeEventListener("mouseup", end)
    removeEventListener("touchmove", onMove)
    removeEventListener("touchend", end)
    if (onEnd) {
      onEnd(event)
    }
  }
  addEventListener("mousemove", onMove)
  addEventListener("mouseup", end)
  addEventListener("touchmove", onMove)
  addEventListener("touchend", end)
}

tools.Line = (event, cx, onEnd) => {
  cx.lineCap = "round"

  let pos = relativePos(event, cx.canvas)
  trackDrag(event => {
    cx.beginPath()
    cx.moveTo(pos.x, pos.y)
    pos = relativePos(event, cx.canvas)
    cx.lineTo(pos.x, pos.y)
    cx.stroke()
  }, onEnd)
}

tools.Erase = (event, cx) => {
  cx.globalCompositeOperation = "destination-out"
  tools.Line(event, cx, () => {
    cx.globalCompositeOperation = "source-over"
  })
}

controls.color = cx => {
  let input = elt("input", {type: "color"})
  input.addEventListener("change", () => {
    cx.fillStyle = input.value
    cx.strokeStyle = input.value
  })
  return elt("span", null, "Color: ", input)
}

controls.brushSize = cx => {
  let select = elt("select")
  let sizes = [1, 2, 3, 5, 8, 12, 25, 35, 50, 75, 100]
  sizes.forEach(size => {
    select.appendChild(elt("option", {value: size},
                           `${size} pixels`))
  })
  select.addEventListener("change", () => {
    cx.lineWidth = select.value
  })
  return elt("span", null, "Brush size: ", select)
}

createPaint(document.body)