<template>
  <div id="app" :style="mainFontSizeStyle">
    <div v-for="(line, j) in lines" :key="`dh${j}`"  class="line" v-html="line" />
  </div>
</template>

<script>
import * as db from './lib/db'
export default {
  name: 'App',
  components: {
  },
  data: () => ({
    uid: null,
    fontSize: 18,
    maxSegments: 5,
    drawings: {},
    currentDrawingDate: null,
    currentDrawingNr: null,
    currentDrawingWidth: null,
    numRows: null,
    numCharInLine: null,
    linePointers: [],
    version: null
  }),
  created () {
    db.auth(user => {
      const uid = (user || {}).uid || null
      if (uid) {
        db.subscribeSettings(uid, this.updateSettings)
        db.subscribeDrawing(uid, drawingData => {
          this.updateDrawingData(drawingData)
          this.updateLines()
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
      return this.linePointers.map((pointer, i) => {
        return pointer.reduce((res, key) => {
          return res[key]
        }, this.drawings)
      })
    }
  },

  methods: {
    async updateLines () {
      if (!this.currentDrawingNr) return
      const dNr = this.currentDrawingNr
      const dr = this.drawings[dNr]
      await this.printBlock(dr.header, [dNr, 'header'])
      await dr.doodles.reduce((promiseChain, doodle, i) => {
        return promiseChain.then(() => {
          return this.printBlock(doodle.header, [dNr, 'doodles', i, 'header'])
            .then(() => this.printBlock(doodle.state, [dNr, 'doodles', i, 'state']))
        })
      }, Promise.resolve())
    },

    async printBlock (block, address, time = 200) {
      return block.reduce((promiseChain, item, i) => {
        return promiseChain.then(() => {
          this.linePointers.push([...address, i])
          if (this.linePointers.length > this.numRows) this.linePointers.shift()
          return new Promise(resolve => {
            setTimeout(() => {
              resolve()
            }, time)
          })
        })
      }, Promise.resolve())
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
    },

    /**
     * @param {DrawingData} drawing
     */
    updateDrawingData (drawing) {
      this.currentDrawingNr = drawing.number
      this.currentDrawingWidth = drawing.width
      this.currentDrawingDate = drawing
      this.$set(this.drawings, drawing.number, {
        header: this.drawingHeaderStr(drawing).split('\n'),
        doodles: drawing.doodles.map((doodle, i) => ({
          header: this.doodleHeaderStr(doodle, i, drawing.number, drawing.width).split('\n'),
          state: []
        }))
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
        this.$set(this.drawings[this.currentDrawingNr].doodles[i], 'state', this.doodleStateStr(state[i], this.currentDrawingWidth, drawable))
      })
    },

    /**
     * @param {SegmentState[]} state
     * @param {number} drW
     * @param {number[]} drawable
     * @return {string[]}
     */
    doodleStateStr (state, drW = 100, drawable) {
      if (!state) return ['']
      let l1 = this.space(4)
      let l2 = this.space(4)
      let l3 = this.space(4)
      state.forEach((segState, i) => {
        const cl = drawable.includes(i - 1) ? 'select' : 'box'
        l1 += `<span class="${cl}"><span class="spin dimmed">${this.space(2)}</span>` + this.number(segState.spin, 7) + '°' + this.space(2) + '</span>'
        l2 += `<span class="${cl}"><span class="dimmed">x:</span>` + this.number(segState.x / drW * 100, 7) + this.space(3) + '</span>'
        l3 += `<span class="${cl}"><span class="dimmed">y:</span>` + this.number(segState.y / drW * 100, 7) + this.space(3) + '</span>'
        if (segState.xEnd && segState.yEnd) {
          l2 += `<span class="select"><span class="dimmed">x:</span>` + this.number(segState.xEnd / drW * 100, 7) + this.space(3) + '</span>'
          l3 += `<span class="select"><span class="dimmed">y:</span>` + this.number(segState.yEnd / drW * 100, 7) + this.space(3) + '</span>'
        }
      })
      return [l1, l2, l3, '', '']
    },

    /**
     * @param {DoodleData} doodle
     * @param {string} index
     * @param {number} drNum
     * @param {number} drW
     * @return {string}
     */
    doodleHeaderStr (doodle, index, drNum, drW) {
      /*
       * 1: Doodle #12549-1 (top-left)
       * Virtual drawing devise: A chain of 3 spinning line-segments with a fixed origin and
       * 2 drawing points on the vertices of the 2nd and 5th segments.
       * Probability of a spin flip for each segment less than 10%
       *
      * */
      const doodN = `${index + 1}`
      const numSegments = doodle.segments.length
      const numPoints = (doodle.drawingPoints || []).length + 1
      const chance = Math.round(this.round(doodle.probabilitySpinFlip) * 100)
      let text = `${doodN.padEnd(2, ' ')}: Doodle #${drNum}-${doodN}
      <span class="str">Drawing devise</span>: A chain of <span class="num">${numSegments}</span> spinning line-segments with a fixed origin and <span class="num">${numPoints}</span> drawing points.
      `
      if (chance) {
        text += `Probability of spin flip for each segment less than <span class="num">${chance}%</span>`
      } else {
        text += `With constant spin direction`
      }
      text += `
      
      `
      /*
       * A          B           A          D
       * |⟵45.79⟶|⟵56.45⟶|⟵34.00⟶|
       *                        ✐         ✐
       */
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      text += this.space(4)
      doodle.segments.forEach((seg, i) => {
        text += letters[i]
        text += this.space(11)
      })
      text += `${letters[doodle.segments.length]}
        `
      text += this.space(4)
      doodle.segments.forEach((seg, i) => {
        if (i === 0) text += '<span class="box">|</span>'
        const l = this.number(seg.length / drW * 100, 5)
        text += `<span class="box">───</span>${l}<span class="box">───|</span>`
      })
      text += `
        `
      text += this.space(4) + '&nbsp;'
      doodle.segments.forEach((seg, i) => {
        if ((doodle.drawingPoints || []).includes(i) || i === doodle.segments.length - 1) {
          text += this.space(11) + '<span class="pen str">&nbsp;</span>'
        } else {
          text += this.space(12)
        }
      })
      return text
    },

    /**
     * @param {DrawingData} drawing
     * @return {string}
     */
    drawingHeaderStr (drawing) {
      /**
       * Drawing #12549, 4 Doodles (2x2):
       */
      let text = `
      <span class="str">Drawing #${drawing.number}</span>, ${drawing.doodles.length} Doodles (${drawing.columns}x${drawing.rows}):
      
      `
      /**
       *  1 │ 2
       * ───┼───
       *  3 │ 4
       */
      for (let r = 0; r < drawing.rows; r++) {
        if (r > 0) {
          for (let c = 0; c < drawing.columns; c++) {
            text += '<span class="box">'
            if (c > 0) text += `┼`
            text += `───`
            if (drawing.doodles.length > 9) text += `─`
          }
          text += `</span>
`
        }
        for (let c = 0; c < drawing.columns; c++) {
          if (c > 0) text += `<span class="box">│</span>`
          let nr = `${((c + 1) * (r + 1))}`
          if (drawing.doodles.length > 9) nr = nr.padEnd(2, ' ')
          text += `&nbsp;${nr}&nbsp;`
        }
        text += `
`
      }
      return text
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
    }
  },

  beforeDestroy () {
    db.unsubscribe()
  }
}
/**
 * Drawing #12549, 4 Doodles (2x2):
 *
 *  1 │ 2
 * ───┼───
 *  3 │ 4
 *
 * 1: Doodle #12549-1 (top-left)
 * Virtual drawing devise: A chain of 3 spinning line-segments with a fixed origin and
 * 2 drawing points on the vertices of the 2nd and 5th segments.
 * Probability of a spin flip for each segment less than 10%
 *
 * A          B           A          D
 * |⟵45.79⟶|⟵56.45⟶|⟵34.00⟶|
 *                        ✐         ✐
 * ⤾ 0.2°     ⤿ -2.34°   ⤿ -0.34°  .
 * x: 65.34   x: 12.34    x: 12.34   x:12.34
 * y: 44.22   y:  5.22    y:  5.22   y: 5.22
 *
 */
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
  }
#app {
  display: flex;
  flex-flow: column;
  justify-content: flex-end;
  padding: 0 0 0 10px;
  background: black;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  overflow: hidden;
  border-radius: 600px;

  font-family: 'Roboto Mono', monospace;
  font-size: 18px;
  line-height: 1;
  color: #fff;

  .line {
    min-height: 1em;
    white-space: nowrap;

    .select {
      font-weight: 700;
    }

    .box {
      color: #b5b5b5;
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
    .pen {
      position: relative;
      &:after {
        content: '✐';
        background-color: #fffa78;
        padding: 0 2px;
        color: black;
        position: absolute;
        left: 0;
        top: 50%;
        transform: translate(-2px, -50%);
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
