/**
 * maxim tyminko 27.06.20.
 * maximtyminko.com
 *
 *  . .    ,  ,--. ,--.   ,  ,--- ,--. ,--, ,--. ,--. ,--.
 * -|-|-  /|     /  __|  /|  |__  |__    /  \__/ \__| | /|
 * -|-|- ' |  ,-'     | '-+-    \ |  \  /   /  \    | |/ |
 *  ' `   -^- '--- `--'   '  `--' `--' '    `--' `--' `--'
 */

const font = 'jaz'
/**
 * @param {string|number} number
 * @return {string[]}
 */
export function numberToAsciiLines (number) {
  const nn = [...`${number}`]
  let asciiFunc
  switch (font) {
    case 'banner':
      asciiFunc = asciiBanner
      break
    case 'jaz':
      asciiFunc = asciiJaz
      break
    default:
      asciiFunc = ascii
  }
  return nn.map(n => asciiFunc(n)).reduce((res, str, i) => {
    const lines = str.split('\n')
    if (!res.length) {
      return lines
    } else {
      return res.map((line, i) => line + ' ' + lines[i])
    }
  }, [])
    .map(line => '<span class="dimmed">' + line.replace(/\s/g, '&nbsp;') + '</span>')
    // .map(line => line.replace(/#/g, '•'))
}

/**
 * @param {string} n
 * @return {string}
 */
function ascii (n) {
  switch (n) {
    case '1' :
      return `  , 
 /| 
' | 
 -^-`
    case '2' :
      return `,--.
   /
,-' 
'---`
    case '3' :
      return `,--.
 __|
   |
\`--'`
    case '4' :
      return `  , 
 /| 
'-+-
  ' `
    case '5' :
      return `,---
|__ 
   \\
\`--'`
    case '6' :
      return `,--.
|__ 
|  \\
\`--'`
    case '7' :
      return `,--,
  / 
 /  
'   `
    case '8' :
      return `,--.
\\__/
/  \\
\`--'`
    case '9' :
      return `,--.
\\__|
   |
\`--'`
    case '0' :
      return `,--.
| /|
|/ |
\`--'`
    case '#' :
      return ` . . 
-|-|-
-|-|-
 ' ' `
    default: return ' '
  }
}

/**
 *
 *
 *        .o .oPYo. .oPYo.    .8  oooooo .pPYo. oooooo  .PY.  .oPYo. .oPYo.
 *         8     `8     `8   d'8  8      8         .o'  8  8  8'  `8 8  .o8
 * .8..8.  8    oP'   .oP'  d' 8  8pPYo. 8oPYo.   .o'  .oPYo. 8.  .8 8 .P'8
 * `8`'8'  8 .oP'      `b. Pooooo     `8 8'  `8  .o'   8'  `8 `YooP8 8.d' 8
 * .8..8.  8 8'         :8     8      .P 8.  .P .o'    8.  .P     .P 8o'  8
 * `8`'8'  8 8ooooo `YooP'     8  `YooP' `YooP' o'     `YooP' `YooP' `YooP'
 *
 * @param {string} n
 * @return {string}
 */
function asciiJaz (n) {
  switch (n) {
    case '1' :
      return `.o
 8
 8
 8
 8
 8`
    case '2' :
      return `.oPYo.
    \`8
   oP'
.oP'  
8'    
8ooooo`
    case '3' :
      return `.oPYo.
    \`8
  .oP'
   \`b.
    :8
\`YooP'`
    case '4' :
      return `   .8 
  d'8 
 d' 8 
Pooooo
    8 
    8 `
    case '5' :
      return `oooooo
8     
8pPYo.
    \`8
    .P
\`YooP'`
    case '6' :
      return `.pPYo.
8     
8oPYo.
8'  \`8
8.  .P
\`YooP'`
    case '7' :
      return `oooooo
   .o'
  .o' 
 .o'  
.o'   
o'    `
    case '8' :
      return ` .PY. 
 8  8 
.oPYo.
8'  \`8
8.  .P
\`YooP'`
    case '9' :
      return `.oPYo.
8'  \`8
8.  .8
\`YooP8
    .P
\`YooP'`
    case '0' :
      return `.oPYo.
8  .o8
8 .P'8
8.d' 8
8o'  8
\`YooP'`
    case '#' :
      return `      
      
.8..8.
\`8\`'8'
.8..8.
\`8\`'8'`
    default: return ' '
  }
}
/*

   # #     #    #####   #####  #       #######  #####  #######  #####   #####    ###
   # #    ##   #     # #     # #    #  #       #     # #    #  #     # #     #  #   #
 ####### # #         #       # #    #  #       #           #   #     # #     # #     #
   # #     #    #####   #####  #    #  ######  ######     #     #####   ###### #     #
 #######   #   #             # #######       # #     #   #     #     #       # #     #
   # #     #   #       #     #      #  #     # #     #   #     #     # #     #  #   #
   # #   ##### #######  #####       #   #####   #####    #      #####   #####    ###

* */
/**
 * @param {string} n
 * @return {string}
 */
function asciiBanner (n) {
  switch (n) {
    case '1' :
      return `  #  
 ##  
# #  
  #  
  #  
  #  
#####`
    case '2' :
      return ` ##### 
#     #
      #
 ##### 
#      
#      
#######`
    case '3' :
      return ` ##### 
#     #
      #
 ##### 
      #
#     #
 ##### `
    case '4' :
      return `#      
#    # 
#    # 
#    # 
#######
     # 
     # `
    case '5' :
      return `#######
#      
#      
###### 
      #
#     #
 ##### `
    case '6' :
      return ` ##### 
#     #
#      
###### 
#     #
#     #
 ##### `
    case '7' :
      return `#######
#    # 
    #  
   #   
  #    
  #    
  #    `
    case '8' :
      return ` ##### 
#     #
#     #
 ##### 
#     #
#     #
 ##### `
    case '9' :
      return ` ##### 
#     #
#     #
 ######
      #
#     #
 ##### `
    case '0' :
      return `  ###  
 #   # 
#     #
#     #
#     #
 #   # 
  ###  `
    case '#' :
      return `  # #  
  # #  
#######
  # #  
#######
  # #  
  # #  `
    default: return ' '
  }
}
