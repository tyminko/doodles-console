<template>
  <div id="app" :style="mainFontSizeStyle">
    <div v-for="(line, j) in lines" :key="`dh${j}`"  class="line" v-html="line" />
  </div>
</template>

<script>
import * as db from './lib/db'
import { numberToAsciiLines } from './lib/ascii-numbers'

export default {
  name: 'App',
  components: {
  },
  data: () => ({
    uid: null,
    allowToPrint: true,
    fontSize: 18,
    maxSegments: 5,
    drawings: {},
    curPrintingBlock: [],
    lastPrintedLineIndex: 0,
    printLineTimeout: null,
    currentDrawingDate: null,
    currentDrawingNr: null,
    currentDrawingWidth: null,
    numRows: null,
    numCharInLine: null,
    onscreenLinePointers: [],
    version: null,
    checkForCleaningDrawings: false
  }),
  created () {
    db.auth(user => {
      const uid = (user || {}).uid || null
      if (uid) {
        db.subscribeSettings(uid, this.updateSettings)
        db.subscribeDrawing(uid, drawingData => {
          this.updateDrawingData(drawingData)
          this.checkForCleaningDrawings = true
          this.startPrintingDrawing()
        })
        db.subscribeState(uid, this.updateStateData)
      }
    })
    window.addEventListener('resize', () => { this.numRows = Math.floor(window.innerHeight / this.fontSize) })
  },

  computed: {
    mainFontSizeStyle () {
      return { fontSize: `${this.fontSize}px` }
    },

    lines () {
      return this.onscreenLinePointers.map((pointer, i) => {
        if (!pointer) return
        return this.getLineFromPointer(pointer)
      })
    },

    drawingLinePointers () {
      if (!this.currentDrawingNr) return []
      const dNr = this.currentDrawingNr + ''
      return this.objectToPointers(this.drawings[dNr], [dNr])
    },

    activeDrawings () {
      return this.onscreenLinePointers.reduce((res, pointer) => {
        const drNr = (pointer || [])[0] || ''
        if (res.includes(drNr)) return res
        return [...res, drNr]
      }, [])
    }
  },

  watch: {
    activeDrawings () {
      if (this.checkForCleaningDrawings) {
        this.cleanupDrawings()
        this.checkForCleaningDrawings = false
      }
    },
    curPrintingBlock (val) {
      if (!val.length && this.allowToPrint) {
        this.printLineTimeout = setTimeout(() => {
          this.printNextBlock()
        }, 5000)
      }
    },

    allowToPrint (value) {
      if (value) {
        this.startPrintingDrawing()
      } else {
        clearTimeout(this.printLineTimeout)
      }
    }
  },

  methods: {
    async startPrintingDrawing () {
      if (!this.currentDrawingNr) return
      this.curPrintingBlock = []
      const headerLength = this.drawings[this.currentDrawingNr].header.length
      this.lastPrintedLineIndex = Math.min(headerLength - 1, this.drawingLinePointers.length - 1)
      this.printLineBlockWithTimeout(0, this.lastPrintedLineIndex)
    },

    printNextBlock () {
      if (!this.currentDrawingNr) return
      let start = this.lastPrintedLineIndex + 1
      if (start >= this.drawingLinePointers.length - 1) {
        start = this.drawings[this.currentDrawingNr].header.length
      }
      const sample = this.drawings[this.currentDrawingNr].doodles[0]
      const doodleLength = sample.header.length + sample.state.length
      this.lastPrintedLineIndex = Math.min(start + doodleLength - 1, this.drawingLinePointers.length - 1)
      this.printLineBlockWithTimeout(start, this.lastPrintedLineIndex)
    },

    printLineBlockWithTimeout (startN, lastN, timePerLine = 50) {
      clearTimeout(this.printLineTimeout)
      this.curPrintingBlock = [...this.drawingLinePointers].splice(startN, lastN - startN + 1)
      const print = block => {
        const toPrint = block.shift()
        this.onscreenLinePointers.push(toPrint)
        if (this.onscreenLinePointers.length > this.numRows) this.onscreenLinePointers.shift()
        if (block.length) {
          this.printLineTimeout = setTimeout(() => {
            requestAnimationFrame(() => print(block))
          }, timePerLine)
        }
      }
      print(this.curPrintingBlock)
    },

    /**
     * @param {Settings} settings
     */
    async updateSettings (settings) {
      if (!settings) return
      if (this.version) {
        if (this.version !== settings.consoleVersion) {
          window.location.reload()
        }
      } else {
        this.version = settings.consoleVersion
      }
      this.fontSize = settings.fontSize || 10
      this.maxSegments = settings.maxSegments || 5
      await this.$nextTick(() => {
        this.numRows = Math.floor(window.innerHeight / this.fontSize)
      })
      // this.allowToPrint = !(settings.doodles || { pause: false }).pause
    },

    /**
     * @param {DrawingData} drawing
     */
    updateDrawingData (drawing) {
      this.currentDrawingNr = drawing.number
      this.currentDrawingWidth = drawing.width
      this.currentDrawingDate = drawing
      this.$set(this.drawings, drawing.number, {
        header: this.drawingHeaderLines(drawing),
        doodles: drawing.doodles.map((doodle, i) => {
          const drawable = [...(doodle.drawingPoints || []), (doodle.segments || []).length - 1]
          return {
            header: this.doodleHeaderLines(doodle, i, drawing.number, drawing.width, drawable),
            state: []
          }
        })
      })
    },

    /**
     * @param {DrawingState} state
     * @param {number} drW
     */
    updateStateData (state, drW) {
      if (!this.currentDrawingNr || !this.drawings[this.currentDrawingNr]) return
      this.drawings[this.currentDrawingNr].doodles.forEach((doodle, i) => {
        const dd = this.currentDrawingDate.doodles[i]
        const drawable = [...(dd.drawingPoints || []), (dd.segments || []).length - 1]
        this.$set(this.drawings[this.currentDrawingNr].doodles[i], 'state', this.doodleStateLines(state[i], this.currentDrawingWidth, drawable))
      })
    },

    /**
     * @param {DrawingData} drawing
     * @return {string[]}
     */
    drawingHeaderLines (drawing) {
      /**
       *  . .    ,  ,--. ,--.   ,  ,--- ,--. ,--, ,--. ,--. ,--.
       * -|-|-  /|     /  __|  /|  |__  |__    /  \__/ \__| | /|
       * -|-|- ' |  ,-'     | '-+-    \ |  \  /   /  \    | |/ |
       *  ' `   -^- `--- `--'   `  `--' `--' '    `--' `--' `--'
       *
       * Drawing #12549, 4 Doodles (2x2):
       *
       *  1 │ 2
       * ───┼───
       *  3 │ 4
       *
       */
      const lines = [
        '&nbsp;',
        '&nbsp;',
        ...numberToAsciiLines(`#${drawing.number}`),
        '&nbsp;',
        '&nbsp;',
        `<span class="str">Drawing #${drawing.number}</span>, ${drawing.doodles.length} Doodles (${drawing.columns}x${drawing.rows}):`,
        '&nbsp;',
        ...this.drawingTableLines(drawing.columns, drawing.rows),
        '&nbsp;',
        '&nbsp;'
      ]
      return lines.map(line => this.space(4) + line)
    },

    drawingTableLines (cols, rows) {
      /**
       *  1 │ 2
       * ───┼───
       *  3 │ 4
       */
      const count = cols * rows
      const lines = []
      for (let r = 0; r < rows; r++) {
        if (r > 0) {
          let line = ''
          for (let c = 0; c < cols; c++) {
            if (c > 0) line += `┼`
            line += count > 9 ? `────` : `───`
          }
          lines.push(`<span class="box">${line}</span>`)
        }
        let line = ''
        for (let c = 0; c < cols; c++) {
          if (c > 0) line += `<span class="box">│</span>`
          let nr = `${((c + 1) * (r + 1))}`
          if (count > 9) nr = nr.padEnd(2, ' ')
          line += `&nbsp;${nr}&nbsp;`
        }
        lines.push(line)
      }
      return lines
    },

    /**
     * @param {DoodleData} doodle
     * @param {string} index
     * @param {number} drNum
     * @param {number} drW
     * @param {number[]} drawable
     * @return {string[]}
     */
    doodleHeaderLines (doodle, index, drNum, drW, drawable) {
      /*
       * 1: Doodle #12549-1 (top-left)
       * Virtual drawing devise: A chain of 3 spinning line-segments with a fixed origin and
       * 2 drawing points on the vertices of the 2nd and 5th segments.
       * Probability of a spin flip for each segment less than 10%
       *
       */
      const doodN = `${index + 1}`
      const numSegments = doodle.segments.length
      const numPoints = (doodle.drawingPoints || []).length + 1
      const chance = Math.round(this.round(doodle.probabilitySpinFlip) * 100)
      const lines = []
      lines.push(`${doodN.padEnd(2, ' ')}: Doodle <span class="num">#${drNum}-${doodN}</span>`)
      lines.push(`<span class=" line-wrap"><span class="str">Drawing devise</span>: A chain of <span class="num">${numSegments}</span> spinning line-segments with a fixed origin and <span class="num">${numPoints}</span> drawing points.</span>`)
      if (chance) {
        lines.push(`Probability of spin flip for each segment less than <span class="num">${chance}%</span>`)
      } else {
        lines.push(`With constant spin direction`)
      }
      lines.push('&nbsp;')
      /*
       * |A          |B          |C ✐       |D ✐
       * |-- 45.79   |-- 56.45   |-- 34.00   |
       *
       */
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      const segHeaderLines = ['', '']
      const pen = `<span class="pen">&nbsp;</span>${this.space(8)}`
      doodle.segments.forEach((seg, i) => {
        const l = this.number(seg.length / drW * 100, 5)
        segHeaderLines[0] += `<span class="box">|</span>${letters[i]}` + (drawable.includes(i - 1) ? pen : this.space(9))
        segHeaderLines[1] += `<span class="box">|</span><span class="length dimmed">${this.space(3)}</span>${l}` + this.space(2)
      })
      segHeaderLines[0] += `<span class="box">|</span>${letters[doodle.segments.length]}` + pen
      segHeaderLines[1] += `<span class="box">|</span>`

      return [...lines, ...segHeaderLines]
    },

    /**
     * @param {SegmentState[]} state
     * @param {number} drW
     * @param {number[]} drawable
     * @return {string[]}
     */
    doodleStateLines (state, drW = 100, drawable) {
      if (!state) return ['']
      let l1 = '' // this.space(4)
      let l2 = '' // this.space(4)
      let l3 = '' // this.space(4)
      state.forEach((segState, i) => {
        const cl = drawable.includes(i - 1) ? 'select' : 'box'
        const spin = this.number(segState.spin % 360, 7)
        const x = this.number(segState.x / drW * 100, 7)
        const y = this.number(segState.y / drW * 100, 7)
        l1 += `<span class="box">|</span><span class="${cl}"><span class="spin dimmed">${this.space(2)}</span>` + spin + '°' + '</span>'
        l2 += `<span class="box">|</span><span class="${cl}"><span class="dimmed">x:</span>` + x + this.space(1) + '</span>'
        l3 += `<span class="box">|</span><span class="${cl}"><span class="dimmed">y:</span>` + y + this.space(1) + '</span>'
        if (segState.xEnd && segState.yEnd) {
          const x = this.number(segState.xEnd / drW * 100, 7)
          const y = this.number(segState.yEnd / drW * 100, 7)
          l1 += `<span class="box">|</span>`
          l2 += `<span class="box">|</span><span class="select"><span class="dimmed">x:</span>` + x + this.space(1) + '</span>'
          l3 += `<span class="box">|</span><span class="select"><span class="dimmed">y:</span>` + y + this.space(1) + '</span>'
        }
      })
      return [l1, l2, l3, '&nbsp;', '&nbsp;']
    },

    /**
     * @param {number} n
     * @param {string} str
     * @return {string}
     */
    space (n, str = '') {
      return [...Array(n)].map(_ => str || '&nbsp;').join('')
    },

    round (n) {
      return Math.round(n * 100) / 100
    },

    number (n, chars) {
      const intCars = chars - 3 // 2 decimals + dot
      const rounded = '' + this.round(n)
      const parts = rounded.split('.')
      return (parts[0] || '0').padStart(intCars, '\xa0') + '.' + (parts[1] || '0').padEnd(2, '0')
    },

    cleanupDrawings () {
      const toDelete = Object.keys(this.drawings).filter(drNr => !this.activeDrawings.includes(drNr))
      toDelete.forEach(drNr => this.$delete(this.drawings, drNr))
    },

    getLineFromPointer (pointer) {
      return pointer.reduce((res, key) => {
        return res[key]
      }, this.drawings)
    },

    lastIndexOfPointerPattern (pattern) {
      const matched = Object.entries(this.drawingLinePointers)
        .filter((index, pointer) => pointer.join('').startsWith(pattern))
      if (!matched.length) return -1
      return matched[matched.length - 1][0]
    },

    objectToPointers (obj, pointer = []) {
      return Object.entries(obj).reduce((res, [key, value]) => {
        const p = [...pointer, key]
        if (typeof value === 'object') {
          res = [...res, ...this.objectToPointers(value, p)]
        } else {
          res.push(p)
        }
        return res
      }, [])
    }
  },

  beforeDestroy () {
    db.unsubscribe()
  }
}
/**
 * @typedef {{
 *  fontSize: number,
 *  maxSegments: number,
 *  consoleVersion: string,
 * }} Settings
 *
 * @typedef {{
 *  spin: number,
 *  x: number,
 *  y: number
 *  xEnd?: number,
 *  yEnd?: number
 * }} SegmentState
 *
 * @typedef {SegmentState[][]} DrawingState
 *
 * @typedef {{
 *  length: number
 * }} SegmentData
 *
 * @typedef {{
 *  probabilitySpinFlip: number,
 *  drawingPoints: number[],
 *  segments: SegmentData[],
 *  order: number
 * }} DoodleData
 *
 * @typedef {{
 *  number: number,
 *  width: number,
 *  height: number,
 *  columns: number,
 *  rows: number,
 *  doodles: DoodleData[]
 * }} DrawingData
 *
 */
</script>

<style lang="scss">
  body {
    margin: 0;
    min-height: 100vh;
    width: 100vw;
    background: black;
    display: flex;
    justify-content: center;
  }
#app {
  display: flex;
  flex-flow: column;
  justify-content: flex-end;

  width: 120vmin;
  height: 100vmin;

  padding: 0;
  overflow: hidden;
  border-radius: 40vmin;

  font-family: 'Roboto Mono', monospace;
  font-size: 18px;
  line-height: 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  color: #fff;
  background: black;

  .line {
    /*min-height: 1em;*/
    /*height: auto;*/
    white-space: nowrap;

    .line-wrap {
      height: auto;
      white-space: normal;
    }

    .select {
      font-weight: 700;
    }

    .box {
      color: #fff;
    }
    .dimmed {
      color: #a58bc3;
    }
    .str {
      color: #f296ff;
    }
    .num {
      color: #00ffff;
    }
    .pen, .length {
      position: relative;
      &:after {
        padding: 0 2px;
        position: absolute;
        left: 0;
        top: 50%;
        transform: translate(-2px, -50%);
      }
    }
    .length {
      &:after {
        content: '⟷';
      }
    }
    .pen {
      &:after {
        content: '✐';
        color: #00ffff;
        left: 5px;
      }
    }
    .spin {
      position: relative;
      &:after {
        content: '↻';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
      }
    }
  }
}
</style>
