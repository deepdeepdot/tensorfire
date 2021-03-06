import assert from 'assert'
import { Tensor, OutputTensor, InPlaceTensor, Run, Compile } from '../src/index.js'
import headlessGL from "gl"
import ndt from 'ndarray-tests'
import ndpack from 'ndarray-pack'
import ndunpack from 'ndarray-unpack'
import ndshow from 'ndarray-show'
import ndarray from 'ndarray'
import zeros from 'zeros'

function assEqual(a, b){
	if(ndt.equal(a, b, 1e-5)){

	}else{
		throw new Error('Unequal NDArrays\nFound: \n' + ndshow(a) + '\nExpected: \n' + ndshow(b))
	}
}

const ECHO_LOCATION4 = `
	vec4 process4(ivec4 pos){
		return vec4(pos);
	}
`;


const ECHO_LOCATION = `
	float process(ivec4 pos){
		return float(pos.x);
	}
`;


describe('Basic', () => {

	var gl = headlessGL(100, 100, { preserveDrawingBuffer: true })

	var out = new OutputTensor(gl, [5, 5, 4]);

	describe('Input Validation', function(){
		it('should throw for non-string shader', function() {
			assert.throws(e => Run(null, out))
			assert.throws(e => Compile(null, out))
		});

		it('should throw for non-output tensor', function() {
			var input = new Tensor(gl, [5, 5])
			assert.throws(e => Run(ECHO_LOCATION4, input))
			assert.throws(e => Compile(ECHO_LOCATION4, input))
		});

		// it('should throw for syntax error', function() {
		// 	var input = new OutputTensor(gl, [5, 5])
		// 	assert.throws(e => Run(ECHO_LOCATION4 + '-', input))
		// 	assert.throws(e => Compile(ECHO_LOCATION4 + '-', input))
		// });

		it('should throw for unknown uniforms', function(){
			assert.throws(e => Run(ECHO_LOCATION4, out, { color: [0, 1, 1, 1] }))
		})

		it('should throw for matrix uniforms', function(){
			const KEANU = `
				uniform mat4 wolo;
				vec4 process4(ivec4 pos){
					return vec4(pos);
				}
			`;
			assert.throws(e => Run(KEANU, out))
		})
	})
	describe('basic', function(){
		const downstripe = ndpack([ 
					[ 0, 0, 0, 0, 0 ],
					[ 1, 1, 1, 1, 1 ],
					[ 2, 2, 2, 2, 2 ],
					[ 3, 3, 3, 3, 3 ],
					[ 4, 4, 4, 4, 4 ] ]);

		it('vectorized echo locations', function(){
			Run(ECHO_LOCATION4, out)

			assEqual(out.read().pick(null, null, 0, 0), downstripe)
			assEqual(out.read().pick(null, null, 1, 0), ndpack([ 
					[ 0, 1, 2, 3, 4 ],
					[ 0, 1, 2, 3, 4 ],
					[ 0, 1, 2, 3, 4 ],
					[ 0, 1, 2, 3, 4 ],
					[ 0, 1, 2, 3, 4 ] ]));
		})

		it('scalar echo locations', function(){
			Run(ECHO_LOCATION, out)

			assEqual(out.read().pick(null, null, 0, 0), downstripe)
			assEqual(out.read().pick(null, null, 1, 0), downstripe)
			assEqual(out.read().pick(null, null, 2, 0), downstripe)
			assEqual(out.read().pick(null, null, 3, 0), downstripe)
		})
	})
	
	describe('basic uniforms', function(){

		it('should accept vec4 uniforms', function(){
			const SOLID_FILL4 = `
				uniform vec4 color;
				vec4 process4(ivec4 pos){
					return color;
				}
			`;
			Run(SOLID_FILL4, out, { color: [0.5, 1, 1, 1] })
			assEqual(out.read().pick(0, 0, null, 0), ndpack([0.5, 1, 1, 1]))
			// console.log(ndshow(out.read().pick(0, 0, null, 0)))
		})

		it('should accept vec3 uniforms', function(){
			const SOLID_FILL3 = `
				uniform vec3 color;
				vec4 process4(ivec4 pos){
					return vec4(color, 14);
				}
			`;
			Run(SOLID_FILL3, out, { color: [0.5, -0.8, 1] })
			assEqual(out.read().pick(0, 0, null, 0), ndpack([0.5, -0.8, 1, 14]))
		})	

		it('should accept vec2 uniforms', function(){
			const SOLID_FILL2 = `
				uniform vec2 color;
				vec4 process4(ivec4 pos){
					return vec4(color, -3, 14);
				}
			`;
			Run(SOLID_FILL2, out, { color: [-5, 2] })
			assEqual(out.read().pick(0, 0, null, 0), ndpack([-5, 2, -3, 14]))
		})	

		it('should accept float uniforms', function(){
			const SOLID_FILL_FLOAT = `
				uniform float color;
				vec4 process4(ivec4 pos){
					return vec4(0.2, color, -3, 14);
				}
			`;
			Run(SOLID_FILL_FLOAT, out, { color: Math.PI })
			assEqual(out.read().pick(0, 0, null, 0), ndpack([0.2, Math.PI, -3, 14]))
		})	

		it('should accept int uniforms', function(){
			const SOLID_FILL_INT = `
				uniform int color;
				vec4 process4(ivec4 pos){
					return vec4(0.2, color, 1, 87);
				}
			`;
			Run(SOLID_FILL_INT, out, { color: 17 })
			assEqual(out.read().pick(0, 0, null, 0), ndpack([0.2, 17, 1, 87]))
		})	
	})


	describe('in place tensor', function(){
		const INCREMENT = `
			uniform Tensor image;
			vec4 process4(ivec4 pos){
				return image.read4(pos) + vec4(1,1,1,1);
			}
		`;
		
		it('should increment things', function(){
			var out = new InPlaceTensor(gl, ndpack([
				[5, 6], 
				[-3, 0]]));

			assEqual(out.read(), ndpack([
				[5, 6],
				[-3, 0]]))
			Run(INCREMENT, out, { image: out })
			assEqual(out.read(), ndpack([
				[6, 7],
				[-2, 1]]))

			out.destroy()
		})

		it('should throw for other tensors', function(){
			var out = new OutputTensor(gl, ndpack([
				[5, 6], 
				[-3, 0]]));
			assert.throws(() => Run(INCREMENT, out, { image: out }))
		})
	})


	describe('verify copy invariants', function(){
		function testShape(shape){
			var Z = zeros(shape); 
			for(var i = 0; i < Z.data.length; i++) 
				Z.data[i] = i; 

			var ztens = new Tensor(gl, Z);
			var copy = ztens.copy();
			// console.log(ztens.format, copy.format)
			assEqual(copy.read(), Z)	
		}

		it('2x2', () => testShape([2, 2]))
		it('4x7', () => testShape([4, 7]))
		it('3x2', () => testShape([3, 2]))
		it('8x7', () => testShape([8, 7]))


		it('4x7x3', () => testShape([8, 7, 3]))
		it('5x3x7', () => testShape([5, 3, 7]))
		it('6x2x9', () => testShape([6, 2, 9]))
	})


	
})