var gl = TF.createGL(),
    OutputTensor = TF.OutputTensor,
    Tensor = TF.Tensor,
    InPlaceTensor = TF.InPlaceTensor;


global.gl = gl;

const ColorizeQuad = `
    uniform Tensor image;

    vec4 process(ivec4 pos) {
        if(pos.z == 3){
            float k = dot(readTensor(image, ivec4(pos.xy, 0, 0)), vec4(0.21216, 0.7152, 0.0722, 0));    
            return vec4(k, k, k, 1);
        }
        return readTensor(image, ivec4(pos.xy, 0, 0)) 
            * vec4(pos.z==0?2:1, pos.z==1?2:1, pos.z==2?2:1, 1);
    }
`

const RawMirror = `
    uniform Tensor image;

    vec4 process(ivec4 pos) {
        return vec4(vec2(pos.xy) / 256.0, 0, 1);
        // return texture2D(image.tex, vec2(pos.xy) / vec2(_outputShape.xy));
    }
`;


const ColorMirror = `
    uniform Tensor image;

    vec4 process(ivec4 pos) {
        if(pos.w == 0){
            return readTensor(image, ivec4(pos.xyz, 0));
        }else{
            return readTensor(image, ivec4(pos.yxz, 0));
        }
    }
`

gl.canvas.width = 512
gl.canvas.height = 512


function loadImage(url, cb){
    var image = new Image,
        canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d');
    image.src = url;
    image.onload = function(){
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        ctx.drawImage(image, 0, 0)
        cb(ctx.getImageData(0, 0, canvas.width, canvas.height))
    }
}


loadImage('./doge.jpg', function(im){
    // we can convert the image data into an ndarray
    var ndoge = ndarray(new Float32Array(im.data), [im.width, im.height, 4]);
    ndops.divseq(ndoge, 255)
    global.doge = new Tensor(gl, ndoge.transpose(1, 0, 2))

    // global.mirror = new OutputTensor(gl, [im.width, im.height, 4]);
    // mirror.run(RawMirror, { image: doge })

    // we can load directly from imagedata
    // global.doge = new Tensor(gl, im)

    global.multidoge = new OutputTensor(gl, [im.width, im.height, 4 * 4])
    multidoge.run(ColorizeQuad, { image: doge })

    global.hyperdoge = new OutputTensor(gl, [im.width, im.height, 4 * 4, 2])

    hyperdoge.run(ColorMirror, { image: multidoge })
    hyperdoge.show()

})
