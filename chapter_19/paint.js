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
  let canvas = elt("canvas", {width: window.visualViewport.width * .98, height: window.visualViewport.height * .80})
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

loadImageURL = (cx, url) => {
  let image = document.createElement("img")
  image.addEventListener("load", () => {
    let color = cx.fillStyle, size = cx.lineWidth
    cx.canvas.width = image.width
    cx.canvas.height = image.height
    cx.drawImage(image, 0, 0)
    cx.fillStyle = color
    cx.strokeStyle = color
    cx.lineWidth = size
  })
  image.src = url
}

controls.openFile = cx => {
  let input = elt("input", {type: "file"})
  input.addEventListener("change", () => {
    if (input.files.length == 0) { return }
      let reader = new FileReader()
      reader.addEventListener("load", () => {
        loadImageURL(cx, reader.result)
      })
      reader.readAsDataURL(input.files[0])
  })
  return elt("div", null, "Open file: ", input)
}

controls.openURL = cx => {
  let input = elt("input", {type: "text"})
  let form = elt("form", null,
                 "Open URL: ", input,
                elt("button", {type: "submit"}, "load"))
  form.addEventListener("submit", event => {
    event.preventDefault()
    loadImageURL(cx, form.querySelector("input").value)
  })
  return form
}

tools.Text = (event, cx) => {
  let text = prompt("Text: ", "")
  if (text) {
    let pos = relativePos(event, cx.canvas)
    cx.font = Math.max(7, cx.lineWidth) + "px sans-serif"
    cx.fillText(text, pos.x, pos.y)
  }
}

tools.Spray = (event, cx) => {
  let radius = cx.lineWidth / 2
  let area = radius * radius * Math.PI
  let dotsPerTick = Math.ceil(area / 30)

  let currentPos = relativePost(event, cx.canvas)
  let spray = setInterval(() => {
    for (let i = 0; i < dotsPerTick; i++) {
      let offset = randomPointInRaidus(radius)
      cx.fillRect(currentPos.x + offset.x,
                  currentPos.y + offset.y, 1, 1)
    }
  }, 25)
  trackDrag(event => {
    currentPos = relativePos(event, cx.canvas)
  }, () => {
    clearInterval(spray)
  })
}

randomPointInRaidus = radius => {
  for (;;) {
    let x = Math.random() * 2 - 1
    let y = Math.random() * 2 - 1
    if (x * x + y * y <= 1) {
      return {x: x * radius, y: y * radius}
    }
  }
}

createPaint(document.body)