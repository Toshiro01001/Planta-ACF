/* filhos3d.js · formas detalhadas das criaturas no 3D da Planta (A Caixa de Fósforos)
   Baixado junto com o 3D (sala3d.js). Cada forma tem só a aparência; qual criatura usa qual forma é escolha
   do Mestre (mapa/formas), feita pelo painel do 3D ou pelo arquivo de cenas (fora do GitHub).
   Inclui o BufferGeometryUtils do three.js r128 (licença MIT, (c) 2010-2021 three.js authors), instalado
   na primeira vez que uma forma é montada. */
(() => {
  const NS = window.ACF3D = window.ACF3D || {};
  NS.instalarBGU = () => {
    const THREE = window.THREE; if (!THREE || THREE.BufferGeometryUtils) return;


	class BufferGeometryUtils {

		static computeTangents( geometry ) {

			geometry.computeTangents();
			console.warn( 'THREE.BufferGeometryUtils: .computeTangents() has been removed. Use THREE.BufferGeometry.computeTangents() instead.' );

		}
		/**
   * @param  {Array<BufferGeometry>} geometries
   * @param  {Boolean} useGroups
   * @return {BufferGeometry}
   */


		static mergeBufferGeometries( geometries, useGroups = false ) {

			const isIndexed = geometries[ 0 ].index !== null;
			const attributesUsed = new Set( Object.keys( geometries[ 0 ].attributes ) );
			const morphAttributesUsed = new Set( Object.keys( geometries[ 0 ].morphAttributes ) );
			const attributes = {};
			const morphAttributes = {};
			const morphTargetsRelative = geometries[ 0 ].morphTargetsRelative;
			const mergedGeometry = new THREE.BufferGeometry();
			let offset = 0;

			for ( let i = 0; i < geometries.length; ++ i ) {

				const geometry = geometries[ i ];
				let attributesCount = 0; // ensure that all geometries are indexed, or none

				if ( isIndexed !== ( geometry.index !== null ) ) {

					console.error( 'THREE.BufferGeometryUtils: .mergeBufferGeometries() failed with geometry at index ' + i + '. All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.' );
					return null;

				} // gather attributes, exit early if they're different


				for ( const name in geometry.attributes ) {

					if ( ! attributesUsed.has( name ) ) {

						console.error( 'THREE.BufferGeometryUtils: .mergeBufferGeometries() failed with geometry at index ' + i + '. All geometries must have compatible attributes; make sure "' + name + '" attribute exists among all geometries, or in none of them.' );
						return null;

					}

					if ( attributes[ name ] === undefined ) attributes[ name ] = [];
					attributes[ name ].push( geometry.attributes[ name ] );
					attributesCount ++;

				} // ensure geometries have the same number of attributes


				if ( attributesCount !== attributesUsed.size ) {

					console.error( 'THREE.BufferGeometryUtils: .mergeBufferGeometries() failed with geometry at index ' + i + '. Make sure all geometries have the same number of attributes.' );
					return null;

				} // gather morph attributes, exit early if they're different


				if ( morphTargetsRelative !== geometry.morphTargetsRelative ) {

					console.error( 'THREE.BufferGeometryUtils: .mergeBufferGeometries() failed with geometry at index ' + i + '. .morphTargetsRelative must be consistent throughout all geometries.' );
					return null;

				}

				for ( const name in geometry.morphAttributes ) {

					if ( ! morphAttributesUsed.has( name ) ) {

						console.error( 'THREE.BufferGeometryUtils: .mergeBufferGeometries() failed with geometry at index ' + i + '.  .morphAttributes must be consistent throughout all geometries.' );
						return null;

					}

					if ( morphAttributes[ name ] === undefined ) morphAttributes[ name ] = [];
					morphAttributes[ name ].push( geometry.morphAttributes[ name ] );

				} // gather .userData


				mergedGeometry.userData.mergedUserData = mergedGeometry.userData.mergedUserData || [];
				mergedGeometry.userData.mergedUserData.push( geometry.userData );

				if ( useGroups ) {

					let count;

					if ( isIndexed ) {

						count = geometry.index.count;

					} else if ( geometry.attributes.position !== undefined ) {

						count = geometry.attributes.position.count;

					} else {

						console.error( 'THREE.BufferGeometryUtils: .mergeBufferGeometries() failed with geometry at index ' + i + '. The geometry must have either an index or a position attribute' );
						return null;

					}

					mergedGeometry.addGroup( offset, count, i );
					offset += count;

				}

			} // merge indices


			if ( isIndexed ) {

				let indexOffset = 0;
				const mergedIndex = [];

				for ( let i = 0; i < geometries.length; ++ i ) {

					const index = geometries[ i ].index;

					for ( let j = 0; j < index.count; ++ j ) {

						mergedIndex.push( index.getX( j ) + indexOffset );

					}

					indexOffset += geometries[ i ].attributes.position.count;

				}

				mergedGeometry.setIndex( mergedIndex );

			} // merge attributes


			for ( const name in attributes ) {

				const mergedAttribute = this.mergeBufferAttributes( attributes[ name ] );

				if ( ! mergedAttribute ) {

					console.error( 'THREE.BufferGeometryUtils: .mergeBufferGeometries() failed while trying to merge the ' + name + ' attribute.' );
					return null;

				}

				mergedGeometry.setAttribute( name, mergedAttribute );

			} // merge morph attributes


			for ( const name in morphAttributes ) {

				const numMorphTargets = morphAttributes[ name ][ 0 ].length;
				if ( numMorphTargets === 0 ) break;
				mergedGeometry.morphAttributes = mergedGeometry.morphAttributes || {};
				mergedGeometry.morphAttributes[ name ] = [];

				for ( let i = 0; i < numMorphTargets; ++ i ) {

					const morphAttributesToMerge = [];

					for ( let j = 0; j < morphAttributes[ name ].length; ++ j ) {

						morphAttributesToMerge.push( morphAttributes[ name ][ j ][ i ] );

					}

					const mergedMorphAttribute = this.mergeBufferAttributes( morphAttributesToMerge );

					if ( ! mergedMorphAttribute ) {

						console.error( 'THREE.BufferGeometryUtils: .mergeBufferGeometries() failed while trying to merge the ' + name + ' morphAttribute.' );
						return null;

					}

					mergedGeometry.morphAttributes[ name ].push( mergedMorphAttribute );

				}

			}

			return mergedGeometry;

		}
		/**
   * @param {Array<BufferAttribute>} attributes
   * @return {BufferAttribute}
   */


		static mergeBufferAttributes( attributes ) {

			let TypedArray;
			let itemSize;
			let normalized;
			let arrayLength = 0;

			for ( let i = 0; i < attributes.length; ++ i ) {

				const attribute = attributes[ i ];

				if ( attribute.isInterleavedBufferAttribute ) {

					console.error( 'THREE.BufferGeometryUtils: .mergeBufferAttributes() failed. InterleavedBufferAttributes are not supported.' );
					return null;

				}

				if ( TypedArray === undefined ) TypedArray = attribute.array.constructor;

				if ( TypedArray !== attribute.array.constructor ) {

					console.error( 'THREE.BufferGeometryUtils: .mergeBufferAttributes() failed. THREE.BufferAttribute.array must be of consistent array types across matching attributes.' );
					return null;

				}

				if ( itemSize === undefined ) itemSize = attribute.itemSize;

				if ( itemSize !== attribute.itemSize ) {

					console.error( 'THREE.BufferGeometryUtils: .mergeBufferAttributes() failed. THREE.BufferAttribute.itemSize must be consistent across matching attributes.' );
					return null;

				}

				if ( normalized === undefined ) normalized = attribute.normalized;

				if ( normalized !== attribute.normalized ) {

					console.error( 'THREE.BufferGeometryUtils: .mergeBufferAttributes() failed. THREE.BufferAttribute.normalized must be consistent across matching attributes.' );
					return null;

				}

				arrayLength += attribute.array.length;

			}

			const array = new TypedArray( arrayLength );
			let offset = 0;

			for ( let i = 0; i < attributes.length; ++ i ) {

				array.set( attributes[ i ].array, offset );
				offset += attributes[ i ].array.length;

			}

			return new THREE.BufferAttribute( array, itemSize, normalized );

		}
		/**
   * @param {Array<BufferAttribute>} attributes
   * @return {Array<InterleavedBufferAttribute>}
   */


		static interleaveAttributes( attributes ) {

			// Interleaves the provided attributes into an THREE.InterleavedBuffer and returns
			// a set of InterleavedBufferAttributes for each attribute
			let TypedArray;
			let arrayLength = 0;
			let stride = 0; // calculate the the length and type of the interleavedBuffer

			for ( let i = 0, l = attributes.length; i < l; ++ i ) {

				const attribute = attributes[ i ];
				if ( TypedArray === undefined ) TypedArray = attribute.array.constructor;

				if ( TypedArray !== attribute.array.constructor ) {

					console.error( 'AttributeBuffers of different types cannot be interleaved' );
					return null;

				}

				arrayLength += attribute.array.length;
				stride += attribute.itemSize;

			} // Create the set of buffer attributes


			const interleavedBuffer = new THREE.InterleavedBuffer( new TypedArray( arrayLength ), stride );
			let offset = 0;
			const res = [];
			const getters = [ 'getX', 'getY', 'getZ', 'getW' ];
			const setters = [ 'setX', 'setY', 'setZ', 'setW' ];

			for ( let j = 0, l = attributes.length; j < l; j ++ ) {

				const attribute = attributes[ j ];
				const itemSize = attribute.itemSize;
				const count = attribute.count;
				const iba = new THREE.InterleavedBufferAttribute( interleavedBuffer, itemSize, offset, attribute.normalized );
				res.push( iba );
				offset += itemSize; // Move the data for each attribute into the new interleavedBuffer
				// at the appropriate offset

				for ( let c = 0; c < count; c ++ ) {

					for ( let k = 0; k < itemSize; k ++ ) {

						iba[ setters[ k ] ]( c, attribute[ getters[ k ] ]( c ) );

					}

				}

			}

			return res;

		}
		/**
   * @param {Array<BufferGeometry>} geometry
   * @return {number}
   */


		static estimateBytesUsed( geometry ) {

			// Return the estimated memory used by this geometry in bytes
			// Calculate using itemSize, count, and BYTES_PER_ELEMENT to account
			// for InterleavedBufferAttributes.
			let mem = 0;

			for ( const name in geometry.attributes ) {

				const attr = geometry.getAttribute( name );
				mem += attr.count * attr.itemSize * attr.array.BYTES_PER_ELEMENT;

			}

			const indices = geometry.getIndex();
			mem += indices ? indices.count * indices.itemSize * indices.array.BYTES_PER_ELEMENT : 0;
			return mem;

		}
		/**
   * @param {BufferGeometry} geometry
   * @param {number} tolerance
   * @return {BufferGeometry>}
   */


		static mergeVertices( geometry, tolerance = 1e-4 ) {

			tolerance = Math.max( tolerance, Number.EPSILON ); // Generate an index buffer if the geometry doesn't have one, or optimize it
			// if it's already available.

			const hashToIndex = {};
			const indices = geometry.getIndex();
			const positions = geometry.getAttribute( 'position' );
			const vertexCount = indices ? indices.count : positions.count; // next value for triangle indices

			let nextIndex = 0; // attributes and new attribute arrays

			const attributeNames = Object.keys( geometry.attributes );
			const attrArrays = {};
			const morphAttrsArrays = {};
			const newIndices = [];
			const getters = [ 'getX', 'getY', 'getZ', 'getW' ]; // initialize the arrays

			for ( let i = 0, l = attributeNames.length; i < l; i ++ ) {

				const name = attributeNames[ i ];
				attrArrays[ name ] = [];
				const morphAttr = geometry.morphAttributes[ name ];

				if ( morphAttr ) {

					morphAttrsArrays[ name ] = new Array( morphAttr.length ).fill().map( () => [] );

				}

			} // convert the error tolerance to an amount of decimal places to truncate to


			const decimalShift = Math.log10( 1 / tolerance );
			const shiftMultiplier = Math.pow( 10, decimalShift );

			for ( let i = 0; i < vertexCount; i ++ ) {

				const index = indices ? indices.getX( i ) : i; // Generate a hash for the vertex attributes at the current index 'i'

				let hash = '';

				for ( let j = 0, l = attributeNames.length; j < l; j ++ ) {

					const name = attributeNames[ j ];
					const attribute = geometry.getAttribute( name );
					const itemSize = attribute.itemSize;

					for ( let k = 0; k < itemSize; k ++ ) {

						// double tilde truncates the decimal value
						hash += `${~ ~ ( attribute[ getters[ k ] ]( index ) * shiftMultiplier )},`;

					}

				} // Add another reference to the vertex if it's already
				// used by another index


				if ( hash in hashToIndex ) {

					newIndices.push( hashToIndex[ hash ] );

				} else {

					// copy data to the new index in the attribute arrays
					for ( let j = 0, l = attributeNames.length; j < l; j ++ ) {

						const name = attributeNames[ j ];
						const attribute = geometry.getAttribute( name );
						const morphAttr = geometry.morphAttributes[ name ];
						const itemSize = attribute.itemSize;
						const newarray = attrArrays[ name ];
						const newMorphArrays = morphAttrsArrays[ name ];

						for ( let k = 0; k < itemSize; k ++ ) {

							const getterFunc = getters[ k ];
							newarray.push( attribute[ getterFunc ]( index ) );

							if ( morphAttr ) {

								for ( let m = 0, ml = morphAttr.length; m < ml; m ++ ) {

									newMorphArrays[ m ].push( morphAttr[ m ][ getterFunc ]( index ) );

								}

							}

						}

					}

					hashToIndex[ hash ] = nextIndex;
					newIndices.push( nextIndex );
					nextIndex ++;

				}

			} // Generate typed arrays from new attribute arrays and update
			// the attributeBuffers


			const result = geometry.clone();

			for ( let i = 0, l = attributeNames.length; i < l; i ++ ) {

				const name = attributeNames[ i ];
				const oldAttribute = geometry.getAttribute( name );
				const buffer = new oldAttribute.array.constructor( attrArrays[ name ] );
				const attribute = new THREE.BufferAttribute( buffer, oldAttribute.itemSize, oldAttribute.normalized );
				result.setAttribute( name, attribute ); // Update the attribute arrays

				if ( name in morphAttrsArrays ) {

					for ( let j = 0; j < morphAttrsArrays[ name ].length; j ++ ) {

						const oldMorphAttribute = geometry.morphAttributes[ name ][ j ];
						const buffer = new oldMorphAttribute.array.constructor( morphAttrsArrays[ name ][ j ] );
						const morphAttribute = new THREE.BufferAttribute( buffer, oldMorphAttribute.itemSize, oldMorphAttribute.normalized );
						result.morphAttributes[ name ][ j ] = morphAttribute;

					}

				}

			} // indices


			result.setIndex( newIndices );
			return result;

		}
		/**
   * @param {BufferGeometry} geometry
   * @param {number} drawMode
   * @return {BufferGeometry>}
   */


		static toTrianglesDrawMode( geometry, drawMode ) {

			if ( drawMode === THREE.TrianglesDrawMode ) {

				console.warn( 'THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles.' );
				return geometry;

			}

			if ( drawMode === THREE.TriangleFanDrawMode || drawMode === THREE.TriangleStripDrawMode ) {

				let index = geometry.getIndex(); // generate index if not present

				if ( index === null ) {

					const indices = [];
					const position = geometry.getAttribute( 'position' );

					if ( position !== undefined ) {

						for ( let i = 0; i < position.count; i ++ ) {

							indices.push( i );

						}

						geometry.setIndex( indices );
						index = geometry.getIndex();

					} else {

						console.error( 'THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible.' );
						return geometry;

					}

				} //


				const numberOfTriangles = index.count - 2;
				const newIndices = [];

				if ( drawMode === THREE.TriangleFanDrawMode ) {

					// gl.TRIANGLE_FAN
					for ( let i = 1; i <= numberOfTriangles; i ++ ) {

						newIndices.push( index.getX( 0 ) );
						newIndices.push( index.getX( i ) );
						newIndices.push( index.getX( i + 1 ) );

					}

				} else {

					// gl.TRIANGLE_STRIP
					for ( let i = 0; i < numberOfTriangles; i ++ ) {

						if ( i % 2 === 0 ) {

							newIndices.push( index.getX( i ) );
							newIndices.push( index.getX( i + 1 ) );
							newIndices.push( index.getX( i + 2 ) );

						} else {

							newIndices.push( index.getX( i + 2 ) );
							newIndices.push( index.getX( i + 1 ) );
							newIndices.push( index.getX( i ) );

						}

					}

				}

				if ( newIndices.length / 3 !== numberOfTriangles ) {

					console.error( 'THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.' );

				} // build final geometry


				const newGeometry = geometry.clone();
				newGeometry.setIndex( newIndices );
				newGeometry.clearGroups();
				return newGeometry;

			} else {

				console.error( 'THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:', drawMode );
				return geometry;

			}

		}
		/**
   * Calculates the morphed attributes of a morphed/skinned THREE.BufferGeometry.
   * Helpful for Raytracing or Decals.
   * @param {Mesh | Line | Points} object An instance of Mesh, Line or Points.
   * @return {Object} An Object with original position/normal attributes and morphed ones.
   */


		static computeMorphedAttributes( object ) {

			if ( object.geometry.isBufferGeometry !== true ) {

				console.error( 'THREE.BufferGeometryUtils: Geometry is not of type THREE.BufferGeometry.' );
				return null;

			}

			const _vA = new THREE.Vector3();

			const _vB = new THREE.Vector3();

			const _vC = new THREE.Vector3();

			const _tempA = new THREE.Vector3();

			const _tempB = new THREE.Vector3();

			const _tempC = new THREE.Vector3();

			const _morphA = new THREE.Vector3();

			const _morphB = new THREE.Vector3();

			const _morphC = new THREE.Vector3();

			function _calculateMorphedAttributeData( object, material, attribute, morphAttribute, morphTargetsRelative, a, b, c, modifiedAttributeArray ) {

				_vA.fromBufferAttribute( attribute, a );

				_vB.fromBufferAttribute( attribute, b );

				_vC.fromBufferAttribute( attribute, c );

				const morphInfluences = object.morphTargetInfluences;

				if ( material.morphTargets && morphAttribute && morphInfluences ) {

					_morphA.set( 0, 0, 0 );

					_morphB.set( 0, 0, 0 );

					_morphC.set( 0, 0, 0 );

					for ( let i = 0, il = morphAttribute.length; i < il; i ++ ) {

						const influence = morphInfluences[ i ];
						const morph = morphAttribute[ i ];
						if ( influence === 0 ) continue;

						_tempA.fromBufferAttribute( morph, a );

						_tempB.fromBufferAttribute( morph, b );

						_tempC.fromBufferAttribute( morph, c );

						if ( morphTargetsRelative ) {

							_morphA.addScaledVector( _tempA, influence );

							_morphB.addScaledVector( _tempB, influence );

							_morphC.addScaledVector( _tempC, influence );

						} else {

							_morphA.addScaledVector( _tempA.sub( _vA ), influence );

							_morphB.addScaledVector( _tempB.sub( _vB ), influence );

							_morphC.addScaledVector( _tempC.sub( _vC ), influence );

						}

					}

					_vA.add( _morphA );

					_vB.add( _morphB );

					_vC.add( _morphC );

				}

				if ( object.isSkinnedMesh ) {

					object.boneTransform( a, _vA );
					object.boneTransform( b, _vB );
					object.boneTransform( c, _vC );

				}

				modifiedAttributeArray[ a * 3 + 0 ] = _vA.x;
				modifiedAttributeArray[ a * 3 + 1 ] = _vA.y;
				modifiedAttributeArray[ a * 3 + 2 ] = _vA.z;
				modifiedAttributeArray[ b * 3 + 0 ] = _vB.x;
				modifiedAttributeArray[ b * 3 + 1 ] = _vB.y;
				modifiedAttributeArray[ b * 3 + 2 ] = _vB.z;
				modifiedAttributeArray[ c * 3 + 0 ] = _vC.x;
				modifiedAttributeArray[ c * 3 + 1 ] = _vC.y;
				modifiedAttributeArray[ c * 3 + 2 ] = _vC.z;

			}

			const geometry = object.geometry;
			const material = object.material;
			let a, b, c;
			const index = geometry.index;
			const positionAttribute = geometry.attributes.position;
			const morphPosition = geometry.morphAttributes.position;
			const morphTargetsRelative = geometry.morphTargetsRelative;
			const normalAttribute = geometry.attributes.normal;
			const morphNormal = geometry.morphAttributes.position;
			const groups = geometry.groups;
			const drawRange = geometry.drawRange;
			let i, j, il, jl;
			let group, groupMaterial;
			let start, end;
			const modifiedPosition = new Float32Array( positionAttribute.count * positionAttribute.itemSize );
			const modifiedNormal = new Float32Array( normalAttribute.count * normalAttribute.itemSize );

			if ( index !== null ) {

				// indexed buffer geometry
				if ( Array.isArray( material ) ) {

					for ( i = 0, il = groups.length; i < il; i ++ ) {

						group = groups[ i ];
						groupMaterial = material[ group.materialIndex ];
						start = Math.max( group.start, drawRange.start );
						end = Math.min( group.start + group.count, drawRange.start + drawRange.count );

						for ( j = start, jl = end; j < jl; j += 3 ) {

							a = index.getX( j );
							b = index.getX( j + 1 );
							c = index.getX( j + 2 );

							_calculateMorphedAttributeData( object, groupMaterial, positionAttribute, morphPosition, morphTargetsRelative, a, b, c, modifiedPosition );

							_calculateMorphedAttributeData( object, groupMaterial, normalAttribute, morphNormal, morphTargetsRelative, a, b, c, modifiedNormal );

						}

					}

				} else {

					start = Math.max( 0, drawRange.start );
					end = Math.min( index.count, drawRange.start + drawRange.count );

					for ( i = start, il = end; i < il; i += 3 ) {

						a = index.getX( i );
						b = index.getX( i + 1 );
						c = index.getX( i + 2 );

						_calculateMorphedAttributeData( object, material, positionAttribute, morphPosition, morphTargetsRelative, a, b, c, modifiedPosition );

						_calculateMorphedAttributeData( object, material, normalAttribute, morphNormal, morphTargetsRelative, a, b, c, modifiedNormal );

					}

				}

			} else if ( positionAttribute !== undefined ) {

				// non-indexed buffer geometry
				if ( Array.isArray( material ) ) {

					for ( i = 0, il = groups.length; i < il; i ++ ) {

						group = groups[ i ];
						groupMaterial = material[ group.materialIndex ];
						start = Math.max( group.start, drawRange.start );
						end = Math.min( group.start + group.count, drawRange.start + drawRange.count );

						for ( j = start, jl = end; j < jl; j += 3 ) {

							a = j;
							b = j + 1;
							c = j + 2;

							_calculateMorphedAttributeData( object, groupMaterial, positionAttribute, morphPosition, morphTargetsRelative, a, b, c, modifiedPosition );

							_calculateMorphedAttributeData( object, groupMaterial, normalAttribute, morphNormal, morphTargetsRelative, a, b, c, modifiedNormal );

						}

					}

				} else {

					start = Math.max( 0, drawRange.start );
					end = Math.min( positionAttribute.count, drawRange.start + drawRange.count );

					for ( i = start, il = end; i < il; i += 3 ) {

						a = i;
						b = i + 1;
						c = i + 2;

						_calculateMorphedAttributeData( object, material, positionAttribute, morphPosition, morphTargetsRelative, a, b, c, modifiedPosition );

						_calculateMorphedAttributeData( object, material, normalAttribute, morphNormal, morphTargetsRelative, a, b, c, modifiedNormal );

					}

				}

			}

			const morphedPositionAttribute = new THREE.Float32BufferAttribute( modifiedPosition, 3 );
			const morphedNormalAttribute = new THREE.Float32BufferAttribute( modifiedNormal, 3 );
			return {
				positionAttribute: positionAttribute,
				normalAttribute: normalAttribute,
				morphedPositionAttribute: morphedPositionAttribute,
				morphedNormalAttribute: morphedNormalAttribute
			};

		}

	}

	THREE.BufferGeometryUtils = BufferGeometryUtils;


  };
})();

/* ===== forma: afogada ===== */
/* afogada.js · forma de Filho: mulher alta de vestido claro encharcado e rasgado, cabelo preto
   molhado cobrindo o rosto, mãos longas e pálidas; a água escorre sem parar das mangas, da barra
   e das pontas do cabelo e forma uma poça com ondas aos pés. Ela desliza mais do que anda.
   Formato: ACF3D.formasFilho.afogada = { nome, criar(F, s) → { g, alt, raioBase, anim } } */
(() => {
  'use strict';
  const NS = window.ACF3D = window.ACF3D || {};
  /* ---------- kit de modelagem (o mesmo nas formas detalhadas) ---------- */
  function kit(F) {
    const T = F.T, U = T.BufferGeometryUtils, V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
    const vv = p => (p && p.isVector3 ? p : V(p[0], p[1], p[2]));
    // material: as cores são escritas como aparecem na tela (vão para o espaço linear aqui)
    const mat = (p = {}, fisico) => {
      const q = { ...p };
      ['color', 'emissive'].forEach(k => { if (typeof q[k] === 'string') q[k] = new T.Color(q[k]).convertSRGBToLinear(); });
      if (q.duplo) { q.side = T.DoubleSide; delete q.duplo; }
      return F.guardar(fisico ? new T.MeshPhysicalMaterial(q) : new T.MeshStandardMaterial(q));
    };
    const tela = (w, h) => NS.tela(w, h || w);
    const tex = (c, rep) => F.texCanvas(c, rep);
    const malha = (pai, geo, m) => { const me = new T.Mesh(F.guardar(geo), m); pai.add(me); return me; };
    const grupo = (pai, x = 0, y = 0, z = 0) => { const g = new T.Group(); g.position.set(x, y, z); if (pai) pai.add(g); return g; };
    // ruído suave (valor) e fractal, para deformar vértices e pintar texturas
    const fr = v => v - Math.floor(v), h3 = (i, j, k) => fr(Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453);
    const sm = t => t * t * (3 - 2 * t), L = (a, b, t) => a + (b - a) * t;
    function vn(x, y, z) {
      const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), u = sm(x - i), v = sm(y - j), w = sm(z - k);
      const a = L(L(h3(i, j, k), h3(i + 1, j, k), u), L(h3(i, j + 1, k), h3(i + 1, j + 1, k), u), v);
      const b = L(L(h3(i, j, k + 1), h3(i + 1, j, k + 1), u), L(h3(i, j + 1, k + 1), h3(i + 1, j + 1, k + 1), u), v);
      return L(a, b, w) * 2 - 1;
    }
    const fbm = (x, y, z, o = 3) => { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * vn(x * f, y * f, z * f); a *= .5; f *= 2.03; } return s; };
    function deform(geo, fn) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const r = fn(p.getX(i), p.getY(i), p.getZ(i), i); if (r) p.setXYZ(i, r[0], r[1], r[2]); }
      p.needsUpdate = true; geo.computeVertexNormals(); return geo;
    }
    /* casca: superfície de revolução de seção elíptica, anel por anel (de baixo para cima).
       perfil: [[y, largura, profundidade, deslocZ, deslocX]]. A frente (+z) fica em u = 0,5 da textura. */
    function casca(perfil, o = {}) {
      const seg = o.seg || 24, n = perfil.length, pos = [], uv = [], idx = [];
      const ab = o.abertura || 0, ps0 = o.arco ? o.arco[0] : ab ? ab / 2 : Math.PI, pl0 = o.arco ? o.arco[1] : ab ? Math.PI * 2 - ab : Math.PI * 2;
      for (let i = 0; i <= seg; i++) {
        const u = i / seg;
        for (let j = 0; j < n; j++) {
          const p = perfil[j], [ps, pl] = o.arcoY ? o.arcoY(p[0], j) : [ps0, pl0], ph = ps + u * pl;
          let sx = Math.sin(ph), sz = Math.cos(ph);
          if (o.quadrado) { sx = Math.sign(sx) * Math.pow(Math.abs(sx), o.quadrado); sz = Math.sign(sz) * Math.pow(Math.abs(sz), o.quadrado); }
          let x = sx * p[1] + (p[4] || 0), y = p[0], z = sz * p[2] + (p[3] || 0);
          if (o.deform) { const r = o.deform(x, y, z, j, u, Math.atan2(Math.sin(ph), Math.cos(ph))); if (r) [x, y, z] = r; }
          pos.push(x, y, z); uv.push(u, j / (n - 1));
        }
      }
      for (let i = 0; i < seg; i++) for (let j = 0; j < n - 1; j++) { const a = i * n + j, b = (i + 1) * n + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx); geo.computeVertexNormals(); return geo;
    }
    // tubo que afina ao longo de uma curva: raio(t), t de 0 a 1 (u da textura corre ao longo do tubo)
    function tubo(pts, raio, o = {}) {
      const curva = new T.CatmullRomCurve3(pts.map(vv), false, 'catmullrom', o.tensao ?? .5);
      const nS = o.seg || 16, nR = o.rad || 6, geo = new T.TubeGeometry(curva, nS, 1, nR, false);
      const pos = geo.attributes.position, P = V();
      for (let i = 0; i <= nS; i++) {
        curva.getPointAt(i / nS, P); const rr = typeof raio === 'number' ? raio : raio(i / nS);
        for (let j = 0; j <= nR; j++) { const k = i * (nR + 1) + j; pos.setXYZ(k, P.x + (pos.getX(k) - P.x) * rr, P.y + (pos.getY(k) - P.y) * rr, P.z + (pos.getZ(k) - P.z) * rr); }
      }
      geo.computeVertexNormals(); return geo;
    }
    // cápsula pendurada: pivô no topo (y = 0), desce até -comp
    function capsula(r1, r2, comp, seg = 8, anel = 3) {
      const pf = [];
      for (let a = 0; a <= anel; a++) { const t = a / anel * Math.PI / 2; pf.push(new T.Vector2(Math.max(1e-4, r2 * Math.sin(t)), -comp - r2 * Math.cos(t))); }
      for (let a = 1; a <= anel; a++) { const t = Math.PI / 2 + a / anel * Math.PI / 2; pf.push(new T.Vector2(Math.max(1e-4, r1 * Math.sin(t)), -r1 * Math.cos(t))); }
      return new T.LatheGeometry(pf, seg);
    }
    // fita (tira de pano) ao longo de uma curva; a face olha para fora do eixo y (ou para normal(P, t))
    function fita(pts, larg, o = {}) {
      const curva = new T.CatmullRomCurve3(pts.map(vv), false, 'catmullrom', .5), n = o.seg || 24, pos = [], uv = [], idx = [];
      const P = V(), Tn = V(), N = V(), B = V();
      for (let i = 0; i <= n; i++) {
        const t = i / n; curva.getPointAt(t, P); curva.getTangentAt(t, Tn);
        if (o.normal) N.copy(o.normal(P, t)); else N.set(P.x, 0, P.z);
        if (N.lengthSq() < 1e-8) N.set(0, 0, 1); N.normalize();
        B.copy(Tn).cross(N).normalize(); const w = (typeof larg === 'number' ? larg : larg(t)) / 2;
        const tor = o.torcao ? o.torcao(t) : 0;
        for (const s of [-1, 1]) { const q = P.clone().addScaledVector(B, s * w).addScaledVector(N, tor * s * w); pos.push(q.x, q.y, q.z); uv.push(s < 0 ? 0 : 1, t * (o.rep || 1)); }
      }
      for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx); geo.computeVertexNormals(); return geo;
    }
    // junta várias malhas fixas num só desenho por material (menos chamadas de desenho)
    function assar(raiz) {
      if (!U || !U.mergeBufferGeometries) return raiz;
      raiz.updateMatrixWorld(true);
      const inv = raiz.matrixWorld.clone().invert(), grupos = new Map();
      raiz.traverse(o => {
        if (!o.isMesh || o.isInstancedMesh) return;
        let g = o.geometry.clone();
        if (!g.index) { const ix = []; for (let i = 0; i < g.attributes.position.count; i++) ix.push(i); g.setIndex(ix); }
        Object.keys(g.attributes).forEach(k => { if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); });
        if (!g.attributes.uv) g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        if (!g.attributes.normal) g.computeVertexNormals();
        g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, o.matrixWorld));
        if (!grupos.has(o.material)) grupos.set(o.material, []);
        grupos.get(o.material).push(g); o.geometry.dispose();
      });
      const out = new T.Group(); out.position.copy(raiz.position); out.quaternion.copy(raiz.quaternion); out.scale.copy(raiz.scale);
      grupos.forEach((lista, m) => { const geo = U.mergeBufferGeometries(lista); lista.forEach(g => g.dispose()); if (geo) malha(out, geo, m); });
      if (raiz.parent) { raiz.parent.add(out); raiz.parent.remove(raiz); }
      return out;
    }
    // gira obj para que o eixo +y local aponte para eixoY e o +z fique o mais perto possível de eixoZ
    function orientar(obj, eixoY, eixoZ) {
      const y = vv(eixoY).clone().normalize(), z = vv(eixoZ).clone(); z.sub(y.clone().multiplyScalar(z.dot(y))).normalize();
      const x = y.clone().cross(z); obj.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z));
    }
    // orienta obj com eixos dados no espaço de ref (ref pode ser o grupo do modelo)
    function alinharEm(obj, ref, eixoY, eixoZ) {
      const tmp = new T.Object3D(); orientar(tmp, eixoY, eixoZ);
      ref.updateWorldMatrix(true, true); const qr = ref.getWorldQuaternion(new T.Quaternion()), qp = obj.parent.getWorldQuaternion(new T.Quaternion());
      obj.quaternion.copy(qp.invert().multiply(qr).multiply(tmp.quaternion));
    }
    // posição de obj no espaço de ref
    const posEm = (obj, ref, out = V()) => { ref.updateWorldMatrix(true, false); obj.getWorldPosition(out); return ref.worldToLocal(out); };
    // membro de dois ossos (braço ou perna) pendurado em -y, com juntas animáveis
    function membro(pai, L1, L2, r0, r1, r2, m, o = {}) {
      const ombro = grupo(pai), braco = grupo(ombro), cot = grupo(braco, 0, -L1, 0), punho = grupo(cot, 0, -L2, 0);
      const g1 = capsula(r0, r1, L1, o.seg || 8, 3), g2 = capsula(r1 * .95, r2, L2, o.seg || 8, 3);
      if (o.ossudo) [g1, g2].forEach((g, k) => deform(g, (x, y, z) => { const t = Math.min(1, Math.max(0, -y / (k ? L2 : L1))); const b = 1 + o.ossudo * (Math.exp(-Math.pow((t - (k ? .02 : .97)) / .08, 2)) * 1.4 - .25 * Math.sin(t * Math.PI)) + fbm(x * 30, y * 30, z * 30, 2) * .08; return [x * b, y, z * b]; }));
      const m1 = malha(braco, g1, m), m2 = malha(cot, g2, m);
      return { ombro, braco, cot, punho, Lb: L1, La: L2, m1, m2 };
    }
    // IK de dois ossos: põe a mão em alvo, com o cotovelo apontando para polo (no espaço do pai do ombro)
    function ik(br, alvo, polo) {
      const P = br.ombro.position.clone(), Tg = vv(alvo).clone(), u = Tg.clone().sub(P); let d = u.length(); u.normalize();
      const L1 = br.Lb, L2 = br.La; d = Math.max(Math.abs(L1 - L2) + 1e-3, Math.min(d, (L1 + L2) * .999));
      const ang = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
      const pv = vv(polo).clone(); pv.sub(u.clone().multiplyScalar(pv.dot(u))).normalize();
      const d1 = u.clone().multiplyScalar(Math.cos(ang)).add(pv.multiplyScalar(Math.sin(ang))).normalize();
      const cot = P.clone().add(d1.clone().multiplyScalar(L1)), d2 = Tg.clone().sub(cot).normalize(), BX = V(0, -1, 0);
      br.ombro.rotation.set(0, 0, 0); br.braco.quaternion.setFromUnitVectors(BX, d1);
      br.cot.quaternion.setFromUnitVectors(BX, d2.applyQuaternion(br.braco.quaternion.clone().invert()));
    }
    /* mão: punho na origem, dedos para -y, palma para +z. lado = -1 mão direita (polegar em -x), +1 esquerda.
       o: { palma, larg, esp, dedo (fator), raio, garra (comprimento), matGarra, abrir } */
    function mao(pai, m, o = {}) {
      const g = grupo(pai), Lp = o.palma || .085, w = o.larg || .07, esp = o.esp || .024, df = o.dedo || 1, rd = o.raio || .0095, lado = o.lado || 1;
      const palma = malha(g, deform(new T.SphereGeometry(1, 10, 8), (x, y, z) => [x * w * .5 * (1 - .12 * y), y * Lp * .5 - Lp * .5, z * esp * .5 * (1 + .3 * y) - (z > 0 ? .002 : 0)]), m);
      const dedos = [], comp = [.92, 1.04, .98, .78], xs = [.36, .12, -.12, -.36], cache = new Map();
      const cap = (r1, r2, l) => { const k = [r1, r2, l].map(v => v.toFixed(4)).join(); if (!cache.has(k)) cache.set(k, capsula(r1, r2, l, 6, 2)); return cache.get(k).clone(); };
      const falange = (pai2, ls, rr, garra) => {
        const segs = []; let p = pai2;
        ls.forEach((l, i) => { const s = grupo(p, 0, i ? -ls[i - 1] : 0, 0); malha(s, cap(rr[i], rr[i + 1], l), m); segs.push(s); p = s; });
        if (garra) { const ponta = malha(p, tubo([[0, -ls[ls.length - 1] + .004, 0], [0, -ls[ls.length - 1] - garra * .55, garra * .12], [0, -ls[ls.length - 1] - garra, garra * .45]], t => rr[rr.length - 1] * 1.1 * (1 - t * .92), { seg: 6, rad: 5 }), o.matGarra || m); ponta.userData.garra = true; }
        return segs;
      };
      for (let f = 0; f < 4; f++) {
        const tot = .085 * df * comp[f], base = grupo(g, xs[f] * w * lado, -Lp * .92 + Math.abs(xs[f]) * Lp * .25, 0);
        base.rotation.z = -xs[f] * lado * (o.abrir ?? .15);
        dedos.push(falange(base, [tot * .43, tot * .32, tot * .25], [rd, rd * .92, rd * .82, rd * .66], o.garra));
      }
      const pol = grupo(g, lado * w * .4, -Lp * .28, esp * .3), dp = 1 + (df - 1) * .45; pol.rotation.set(-.55, -lado * .5, lado * .42);
      dedos.push(falange(pol, [.03 * dp, .026 * dp, .02 * dp], [rd * 1.2, rd * 1.08, rd * .95, rd * .75], o.garra ? o.garra * .7 : 0));
      cache.forEach(c => c.dispose());
      // dobra os dedos: k (0 a 1) por dedo ou um só número; tremor soma um pouco de vida
      const curvar = (k, tremor = 0, t = 0) => dedos.forEach((d, i) => {
        const kk = (Array.isArray(k) ? k[i] : k) + (tremor ? tremor * Math.sin(t * (7 + i * 1.7) + i * 2.1) : 0);
        d.forEach((s, j) => { s.rotation.x = -kk * (i === 4 ? [.25, .5, .4][j] : [.75, 1.05, .8][j]); });
      });
      return { g, dedos, curvar, palma };
    }
    // brilho em volta (sprite somado à luz)
    let texBrilho = null;
    function halo(pai, cor, tam, x = 0, y = 0, z = 0) {
      if (!texBrilho) { const [c, x2] = tela(128); const gr = x2.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x2.fillStyle = gr; x2.fillRect(0, 0, 128, 128); texBrilho = tex(c); }
      const sm2 = F.guardar(new T.SpriteMaterial({ map: texBrilho, color: new T.Color(cor), transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      const sp = new T.Sprite(sm2); sp.scale.set(tam, tam, 1); sp.position.set(x, y, z); pai.add(sp); return sp;
    }
    /* núcleo roxo: esfera brilhante numa moldura escura de espinhos, como patas de aranha (olha para +z) */
    function nucleo(pai, r = .06, o = {}) {
      const g = grupo(pai), luzM = mat({ color: '#2a0640', emissive: '#6a1eff', emissiveIntensity: 1.6, roughness: .15, metalness: .1 });
      const miolo = mat({ color: '#000000', emissive: '#d2b0ff', emissiveIntensity: 1.3 });
      const esf = malha(g, new T.SphereGeometry(r, 20, 14), luzM); esf.scale.z = .8;
      malha(g, new T.SphereGeometry(r * .3, 10, 8), miolo).position.z = r * .66;
      const escuro = mat({ color: '#140c12', roughness: .35, metalness: .55 });
      const mold = grupo(g);
      malha(mold, new T.TorusGeometry(r * 1.12, r * .2, 6, 24), escuro);
      const n = o.pernas || 8;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + .2, c = Math.cos(a), s = Math.sin(a), k = 1 + (i % 2) * .35;
        malha(mold, tubo([[c * r * 1.1, s * r * 1.1, r * .1], [c * r * 1.9 * k, s * r * 1.9 * k, r * .55], [c * r * 2.7 * k, s * r * 2.7 * k, r * .2], [c * r * 3.3 * k, s * r * 3.3 * k - r * .3, -r * .35]], t => r * .16 * (1 - t * .85), { seg: 10, rad: 5 }), escuro);
        const b = .5 + a; malha(mold, new T.ConeGeometry(r * .12, r * .9, 5), escuro).position.set(Math.cos(b) * r * 1.35, Math.sin(b) * r * 1.35, r * .1);
        mold.children[mold.children.length - 1].rotation.z = b - Math.PI / 2;
      }
      const moldA = assar(mold);
      const h = halo(g, o.cor || '#6a22d8', r * (o.halo || 9), 0, 0, r * .9);
      const pulso = t => {
        const ph = (t * .72) % 1, k = Math.exp(-Math.pow((ph - .1) / .05, 2)) + .6 * Math.exp(-Math.pow((ph - .3) / .06, 2));
        luzM.emissiveIntensity = 1.1 + k * 1.5 + Math.sin(t * .5) * .2; h.material.opacity = .35 + k * .4; esf.scale.set(1 + k * .07, 1 + k * .07, .8 + k * .06);
      };
      return { g, pulso, moldura: moldA };
    }
    // utilidades de pintura
    const pinta = {
      grao(x, w, h, n, a, tam = 2, cores) { for (let i = 0; i < n; i++) { x.fillStyle = cores ? cores[(Math.random() * cores.length) | 0] : `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},${a * Math.random()})`; x.globalAlpha = cores ? a * Math.random() : 1; x.fillRect(Math.random() * w, Math.random() * h, tam, tam); } x.globalAlpha = 1; },
      mancha(x, cx, cy, r, cor, a = 1, pontas = 9) { x.save(); x.globalAlpha = a; x.fillStyle = cor; x.beginPath(); for (let i = 0; i <= pontas * 2; i++) { const an = i / (pontas * 2) * Math.PI * 2, rr = r * (.55 + Math.random() * .6); x.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); } x.fill(); x.restore(); },
      escorrido(x, cx, cy, comp, larg, cor, a = 1) { x.save(); x.globalAlpha = a; x.strokeStyle = cor; x.lineCap = 'round'; let px = cx, py = cy; x.lineWidth = larg; x.beginPath(); x.moveTo(px, py); const n = 12; for (let i = 0; i < n; i++) { px += (Math.random() - .5) * larg * .8; py += comp / n; x.lineWidth = larg * (1 - i / n * .6); x.lineTo(px, py); } x.stroke(); x.beginPath(); x.fillStyle = cor; x.arc(px, py, larg * .7, 0, 7); x.fill(); x.restore(); },
      veia(x, x0, y0, ang, comp, larg, cor, a = .5, ramos = 2) { x.save(); x.strokeStyle = cor; x.globalAlpha = a; x.lineCap = 'round'; const rec = (px, py, an, c, l, d) => { x.lineWidth = l; x.beginPath(); x.moveTo(px, py); let qx = px, qy = py; const n = 8; for (let i = 0; i < n; i++) { an += (Math.random() - .5) * .5; qx += Math.cos(an) * c / n; qy += Math.sin(an) * c / n; x.lineTo(qx, qy); if (d > 0 && Math.random() < .18) rec(qx, qy, an + (Math.random() < .5 ? -.7 : .7), c * .5, l * .6, d - 1); } x.stroke(); }; rec(x0, y0, ang, comp, larg, ramos); x.restore(); },
    };
    return { T, V, vv, mat, tela, tex, malha, grupo, fbm, vn, deform, casca, tubo, capsula, fita, assar, orientar, alinharEm, posEm, membro, ik, mao, halo, nucleo, pinta };
  }
  (NS.formasFilho = NS.formasFilho || {}).afogada = {
    nome: 'Mulher encharcada (vestido rasgado)',
    criar: (F, s) => {
      const K = kit(F), { T, V, mat, tela, tex, malha, grupo, fbm, deform, casca, tubo, fita, assar, membro, ik, mao, nucleo, pinta, alinharEm, posEm } = K;
      const R = NS.rng(303), g = grupo(null), corpo = grupo(g);
      const PI = Math.PI;

      /* ---------- silhueta: perfis do vestido e dos ombros [y, largura, profundidade, deslocZ] ---------- */
      const PV = [[0, .47, .43, -.05], [.08, .37, .34, -.035], [.25, .28, .26, -.015], [.5, .225, .205, 0], [.8, .205, .175, .005], [1.05, .205, .158, 0], [1.2, .185, .14, 0], [1.35, .145, .11, 0], [1.48, .15, .115, .005], [1.6, .165, .13, .02], [1.7, .16, .115, .015], [1.78, .165, .105, .005], [1.84, .175, .098, -.005]];
      const PO = [[1.62, .15, .11, 0], [1.74, .2, .11, 0], [1.82, .215, .1, 0], [1.87, .19, .088, .006], [1.9, .12, .074, .012], [1.93, .062, .056, .02], [2.03, .046, .049, .032], [2.1, .044, .046, .036]];
      const interp = (P, y) => { if (y <= P[0][0]) return P[0].slice(1); for (let i = 1; i < P.length; i++) if (y <= P[i][0]) { const a = P[i - 1], b = P[i], k = (y - a[0]) / (b[0] - a[0]); return [1, 2, 3].map(j => a[j] + (b[j] - a[j]) * k); } return P[P.length - 1].slice(1); };
      // empurra um ponto (espaço do corpo) para fora da roupa: o cabelo e os panos não atravessam o corpo
      const afasta = (p, folga = .03) => {
        if (p.y > 2.1) return p;
        let w = 0, d = 0, dz = 0;
        if (p.y <= 1.84) [w, d, dz] = interp(PV, p.y);
        if (p.y >= 1.62) { const q = interp(PO, p.y); if (q[0] > w) { w = q[0]; d = Math.max(d, q[1]); dz = q[2]; } }
        const ex = p.x / (w + folga), ez = (p.z - dz) / (d + folga), r = Math.hypot(ex, ez);
        if (r < 1 && r > 1e-4) { p.x /= r; p.z = dz + (p.z - dz) / r; }
        return p;
      };

      /* ---------- texturas pintadas ---------- */
      // vestido: pano claro encardido, encharcado e escuro na barra, sangue escorrendo do peito, rasgos e furos
      const [cv, xv] = tela(512, 1024);
      let gr = xv.createLinearGradient(0, 0, 0, 1024);
      gr.addColorStop(0, '#bdb5a6'); gr.addColorStop(.4, '#aaa392'); gr.addColorStop(.72, '#8b8b7c'); gr.addColorStop(1, '#4b544d');
      xv.fillStyle = gr; xv.fillRect(0, 0, 512, 1024);
      for (let i = 0; i < 220; i++) { // dobras molhadas: riscos verticais claros e escuros
        const x0 = R() * 512, y0 = R() * 1024, l = 80 + R() * 500, esc = R() < .6;
        xv.strokeStyle = esc ? `rgba(40,38,30,${.03 + R() * .09})` : `rgba(255,252,240,${.03 + R() * .07})`; xv.lineWidth = 2 + R() * 9;
        xv.beginPath(); xv.moveTo(x0, y0); xv.bezierCurveTo(x0 + (R() - .5) * 20, y0 + l * .3, x0 + (R() - .5) * 20, y0 + l * .7, x0 + (R() - .5) * 26, y0 + l); xv.stroke();
      }
      for (let i = 0; i < 90; i++) pinta.mancha(xv, R() * 512, 250 + Math.pow(R(), .6) * 774, 10 + R() * 50, R() < .5 ? '#4f5546' : R() < .5 ? '#6b6450' : '#3e4a44', .12 + R() * .2);
      pinta.grao(xv, 512, 1024, 9000, .08, 2);
      // sangue: do núcleo (frente, u = 0,5, perto do topo) para baixo, e manchas na barra
      for (let i = 0; i < 9; i++) pinta.escorrido(xv, 256 + (R() - .5) * 40, 120 + R() * 30, 160 + R() * 420, 3 + R() * 7, R() < .5 ? '#5a0e0e' : '#7a1414', .55 + R() * .35);
      pinta.mancha(xv, 256, 140, 30, '#3a0808', .7, 12);
      for (let i = 0; i < 12; i++) pinta.mancha(xv, R() * 512, 760 + R() * 240, 8 + R() * 26, '#6a1212', .25 + R() * .3);
      for (let i = 0; i < 6; i++) pinta.escorrido(xv, R() * 512, 300 + R() * 300, 200 + R() * 300, 2 + R() * 4, '#681010', .35);
      // rasgos: a barra em tiras compridas, furos no pano, a borda de cima irregular
      xv.globalCompositeOperation = 'destination-out'; xv.fillStyle = '#000';
      for (let x0 = -10; x0 < 520;) { const w = 6 + R() * 22, l = 30 + R() * 230; xv.beginPath(); xv.moveTo(x0, 1025); xv.lineTo(x0 + w * (.3 + R() * .4), 1024 - l); xv.lineTo(x0 + w, 1025); xv.fill(); x0 += w + R() * 14; }
      for (let i = 0; i < 46; i++) { const y = 380 + Math.pow(R(), .7) * 580, rx = 3 + R() * 16, ry = 6 + R() * 34; pinta.mancha(xv, R() * 512, y, (rx + ry) / 2, '#000', 1, 7); }
      for (let x0 = 0; x0 < 512; x0 += 8 + R() * 18) { xv.beginPath(); xv.moveTo(x0, -1); xv.lineTo(x0 + 4 + R() * 6, 6 + R() * 26); xv.lineTo(x0 + 12 + R() * 8, -1); xv.fill(); }
      xv.globalCompositeOperation = 'source-over';
      const texV = tex(cv);
      // relevo das dobras (cinza): usado como bump
      const [cb, xb] = tela(256, 512); xb.fillStyle = '#808080'; xb.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 160; i++) { const x0 = R() * 256; xb.strokeStyle = `rgba(${R() < .5 ? '0,0,0' : '255,255,255'},${.1 + R() * .25})`; xb.lineWidth = 2 + R() * 7; xb.beginPath(); xb.moveTo(x0, R() * 512); xb.lineTo(x0 + (R() - .5) * 16, R() * 512); xb.stroke(); }
      pinta.grao(xb, 256, 512, 4000, .2, 2);
      const bumpV = tex(cb);
      const matVest = mat({ map: texV, bumpMap: bumpV, bumpScale: .005, roughness: .42, metalness: 0, alphaTest: .5, duplo: true, clearcoat: .55, clearcoatRoughness: .35 }, true);

      // pele: pálida, cinza azulada, veias arroxeadas e manchas
      const [cp, xp] = tela(512, 256); xp.fillStyle = '#b9bbb2'; xp.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 70; i++) pinta.mancha(xp, R() * 512, R() * 256, 8 + R() * 30, R() < .5 ? '#9ea2a0' : '#c9c6bb', .3);
      for (let i = 0; i < 40; i++) pinta.veia(xp, R() * 512, R() * 256, R() * 6.3, 40 + R() * 90, 1 + R() * 2, R() < .6 ? '#5a5f86' : '#6e4d6a', .45, 2);
      pinta.grao(xp, 512, 256, 5000, .07, 1);
      const texP = tex(cp);
      const matPele = mat({ map: texP, bumpMap: texP, bumpScale: .004, roughness: .38, clearcoat: .6, clearcoatRoughness: .3 }, true);
      const matUnha = mat({ color: '#3a3438', roughness: .3 });

      // manga: comprimento no eixo x da tela (u do tubo); a ponta (direita) toda rasgada
      const [cm, xm] = tela(512, 256); const gm = xm.createLinearGradient(0, 0, 512, 0);
      gm.addColorStop(0, '#b3ab9c'); gm.addColorStop(.7, '#958f80'); gm.addColorStop(1, '#5e6258'); xm.fillStyle = gm; xm.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 120; i++) { const y0 = R() * 256, x0 = R() * 512, l = 60 + R() * 300; xm.strokeStyle = R() < .6 ? `rgba(40,38,30,${.06 + R() * .14})` : `rgba(255,252,240,${.05 + R() * .1})`; xm.lineWidth = 1 + R() * 4; xm.beginPath(); xm.moveTo(x0, y0); xm.quadraticCurveTo(x0 + l / 2, y0 + (R() - .5) * 16, x0 + l, y0 + (R() - .5) * 20); xm.stroke(); }
      for (let i = 0; i < 10; i++) pinta.mancha(xm, 200 + R() * 300, R() * 256, 6 + R() * 18, R() < .5 ? '#6a1212' : '#4f5546', .3);
      pinta.grao(xm, 512, 256, 4000, .08, 2);
      xm.globalCompositeOperation = 'destination-out';
      for (let y0 = -6; y0 < 262;) { const w = 5 + R() * 18, l = 20 + R() * 120; xm.beginPath(); xm.moveTo(513, y0); xm.lineTo(512 - l, y0 + w * (.3 + R() * .4)); xm.lineTo(513, y0 + w); xm.fill(); y0 += w + R() * 10; }
      for (let i = 0; i < 18; i++) pinta.mancha(xm, 60 + R() * 400, R() * 256, 4 + R() * 12, '#000', 1, 6);
      for (let y0 = 0; y0 < 256; y0 += 8 + R() * 14) { xm.beginPath(); xm.moveTo(-1, y0); xm.lineTo(5 + R() * 14, y0 + 5); xm.lineTo(-1, y0 + 11); xm.fill(); }
      xm.globalCompositeOperation = 'source-over';
      const matManga = mat({ map: tex(cm), bumpMap: bumpV, bumpScale: .01, roughness: .42, alphaTest: .5, duplo: true, clearcoat: .5, clearcoatRoughness: .35 }, true);
      // tiras que pendem das mangas: a ponta de baixo (topo da tela) em franjas
      const [ct, xt] = tela(128, 512); xt.drawImage(cv, 130, 250, 110, 700, 0, 0, 128, 512);
      xt.globalCompositeOperation = 'destination-out';
      for (let x0 = -4; x0 < 132;) { const w = 6 + R() * 16, l = 40 + R() * 160; xt.beginPath(); xt.moveTo(x0, -1); xt.lineTo(x0 + w * .5, l); xt.lineTo(x0 + w, -1); xt.fill(); x0 += w + R() * 8; }
      for (let i = 0; i < 8; i++) pinta.mancha(xt, R() * 128, 150 + R() * 340, 3 + R() * 8, '#000', 1, 6);
      xt.globalCompositeOperation = 'source-over';
      const matTira = mat({ map: tex(ct), roughness: .42, alphaTest: .5, duplo: true, clearcoat: .5, clearcoatRoughness: .35 }, true);

      // cabelo: preto molhado, brilho de água
      const matCab = mat({ color: '#0b0b0d', roughness: .35, metalness: 0, clearcoat: .6, clearcoatRoughness: .3 }, true);
      const matCabV = mat({ color: '#3d0a0c', roughness: .3, clearcoat: 1, clearcoatRoughness: .2 }, true);

      /* ---------- vestido ---------- */
      const NV = 44, perfilV = [];
      for (let j = 0; j < NV; j++) { const y = j / (NV - 1) * 1.84, q = interp(PV, y); perfilV.push([y, q[0], q[1], q[2]]); }
      const geoV = casca(perfilV, {
        seg: 44, deform: (x, y, z, j, u, ang) => {
          const baixo = Math.max(0, 1.1 - y) / 1.1;
          const vinco = y > .15 && y < 1.02 ? Math.exp(-Math.pow(ang / .22, 2)) * .07 * Math.sin((y - .15) / .87 * Math.PI) : 0;
          const dobra = 1 - vinco + baixo * (.06 * Math.sin(ang * 8 + fbm(x * 3, y * 2, z * 3) * 3) + .05 * fbm(x * 5, y * 3, z * 5)) + .018 * fbm(x * 9, y * 6, z * 9);
          const cauda = Math.cos(ang) < -.3 ? (-Math.cos(ang) - .3) * baixo * baixo * .22 : 0; // a barra arrasta atrás
          return [x * dobra, y + (y < .02 ? -.01 : 0), z * dobra - cauda];
        }
      });
      const vestido = malha(corpo, geoV, matVest);
      // sobressaia em farrapos: painéis que pendem do quadril por cima do vestido
      const saia = grupo(corpo);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * PI * 2 + .2 + R() * .35, comp = .42 + R() * .32, pts = [];
        for (let k = 0; k <= 4; k++) { const y = 1.22 - k / 4 * comp, [w1, d1, dz1] = interp(PV, y), f = 1.05 + k * .035; pts.push([Math.sin(a) * w1 * f, y, Math.cos(a) * d1 * f + dz1]); }
        malha(saia, fita(pts, t => .2 - t * .05, { seg: 10 }), matTira);
      }
      const baseV = Float32Array.from(geoV.attributes.position.array);

      /* ---------- tronco de cima: ombros nus, pescoço, núcleo ---------- */
      const alto = grupo(corpo);
      const perfilO = PO.map(p => [p[0], p[1], p[2], p[3]]);
      malha(alto, casca(perfilO, { seg: 28, quadrado: .85, deform: (x, y, z) => { const cl = y > 1.84 && y < 1.9 && z > 0 ? Math.exp(-Math.pow((Math.abs(x) - .09) / .05, 2)) * .008 : 0; return [x, y, z + cl]; } }), matPele);
      const nuc = nucleo(alto, .042, { halo: 10 }); nuc.g.position.set(0, 1.675, .138); nuc.g.rotation.x = -.12;

      /* ---------- cabeça ---------- */
      const HC = V(0, 2.15, .04);
      const cab = grupo(alto, HC.x, HC.y, HC.z);
      const [cr, xr] = tela(512, 256); xr.fillStyle = '#aeb0a8'; xr.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 20; i++) pinta.veia(xr, R() * 512, R() * 256, R() * 6.3, 40 + R() * 60, 1.5, '#5a5f86', .4, 1);
      [-1, 1].forEach(s2 => { const gx = xr.createRadialGradient(128 + s2 * 24, 118, 2, 128 + s2 * 24, 118, 22); gx.addColorStop(0, '#050404'); gx.addColorStop(.6, '#2a2224'); gx.addColorStop(1, 'rgba(60,50,55,0)'); xr.fillStyle = gx; xr.fillRect(90 + s2 * 24, 90, 76, 60); });
      xr.fillStyle = '#120606'; xr.beginPath(); xr.ellipse(128, 170, 9, 15, 0, 0, 7); xr.fill();
      malha(cab, new T.SphereGeometry(.098, 20, 16), mat({ map: tex(cr), roughness: .4 })).scale.set(.86, 1.16, .95);
      // um olho só aparece entre as mechas: pálido e brilhante
      const [co, xo] = tela(64, 32); xo.fillStyle = '#d9d6c8'; xo.fillRect(0, 0, 64, 32); for (let i = 0; i < 14; i++) pinta.veia(xo, R() * 64, R() * 32, R() * 6.3, 10 + R() * 14, .8, '#9a1a1a', .8, 1);
      xo.fillStyle = '#7d8a88'; xo.beginPath(); xo.arc(16, 16, 5, 0, 7); xo.fill(); xo.fillStyle = '#050505'; xo.beginPath(); xo.arc(16, 16, 1.6, 0, 7); xo.fill();
      const tO = tex(co); const matOlho = mat({ map: tO, emissiveMap: tO, emissive: '#ffffff', emissiveIntensity: .55, roughness: .08 });
      const olho = malha(cab, new T.SphereGeometry(.015, 14, 10), matOlho); olho.position.set(.013, -.004, .084); olho.rotation.y = -.15;
      const brOlho = K.halo(cab, '#d8f4ee', .045, .0135, -.004, .128);

      // cabelo: calota + mechas em "cartões" (fitas com fios pintados e pontas recortadas) + alguns fios soltos
      const [ch, xh] = tela(256, 512); xh.clearRect(0, 0, 256, 512);
      const gh = xh.createLinearGradient(0, 512, 0, 0); gh.addColorStop(0, 'rgba(6,6,8,1)'); gh.addColorStop(.45, 'rgba(6,6,8,1)'); gh.addColorStop(.7, 'rgba(6,6,8,0)');
      xh.fillStyle = gh; xh.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 420; i++) {
        const x0 = R() * 256, len = 512 * (.45 + R() * .55), w = .8 + R() * 2.4, ond = (R() - .5) * 16;
        const c = R() < .06 ? '#4a0c0e' : R() < .22 ? '#3c4148' : R() < .45 ? '#1b1d21' : '#060607';
        xh.strokeStyle = c; xh.lineWidth = w; xh.lineCap = 'round';
        xh.beginPath(); xh.moveTo(x0, 513); xh.bezierCurveTo(x0 + ond, 512 - len * .4, x0 - ond, 512 - len * .7, x0 + ond * .5, 512 - len); xh.stroke();
      }
      const texH = tex(ch);
      const matCard = mat({ map: texH, alphaTest: .45, duplo: true, roughness: .42, metalness: 0, clearcoat: .35, clearcoatRoughness: .4 }, true);
      const calota = malha(cab, new T.SphereGeometry(.106, 22, 12, 0, PI * 2, 0, 1.6), matCab); calota.scale.set(.9, 1.12, .98); calota.rotation.x = -.5;
      const paraCorpo = (p, ref) => V(p[0] + ref.x, p[1] + ref.y, p[2] + ref.z);
      const daCurva = (pts, ref, folga) => pts.map(p => { const w = afasta(paraCorpo(p, ref), folga); return [w.x - ref.x, w.y - ref.y, w.z - ref.z]; });
      const frente = { a: [], c: [] }, costas = { a: [], c: [] }, pontas = [];
      const fio = (lista, pts, r0) => lista.push(tubo(pts, t => r0 * (1 - t * .8) * Math.min(1, .55 + t * 9), { seg: 16, rad: 4 }));
      const cartao = (lista, pts, larg, fresta = 0) => lista.push(fita(pts, t => larg * (1 - t * .25) * (1 - fresta * Math.exp(-Math.pow((t - .2) / .05, 2))), { seg: 22, rep: 1 }));
      // cortina da frente: três cartões, com uma fresta onde o olho espia
      [[-.066, .045, 0, 0], [-.034, .04, 0, .006], [-.006, .045, .6, 0], [.032, .036, 0, .007], [.06, .045, 0, 0]].forEach(([cx, w, fr2, dz2], i) => {
        const fim = -.6 - R() * .22;
        cartao(frente.c, daCurva([[cx * .45, .105, .01], [cx * .85, .094 + dz2, .075], [cx, .045, .114 + dz2], [cx * 1.04, -.05, .124 + dz2], [cx * 1.12, -.22, .12 + dz2], [cx * 1.25, -.44, .12 + dz2], [cx * 1.35, fim, .11 + dz2]], HC, .035), w, fr2);
      });
      for (let i = 0; i < 14; i++) {
        const x0 = -.075 + i / 13 * .15; if (x0 > .0 && x0 < .028) continue;
        const j = (R() - .5) * .03, fim = -.6 - R() * .32;
        fio(frente.a, daCurva([[x0 * .5, .108, .015], [x0 * .85, .098, .08], [x0 * 1.02, .048, .12], [x0 * 1.08 + j * .3, -.04, .13], [x0 * 1.15 + j * .6, -.17, .127], [x0 * 1.3 + j, -.36, .128], [x0 * 1.45 + j, fim, .118]], HC, .042), .0045 + R() * .002);
        pontas.push(V(x0 * 1.45 + j, fim, .118));
      }
      // lados e costas: cartões largos até a cintura e mais abaixo
      [-1, 1].forEach(sx => {
        for (let i = 0; i < 3; i++) {
          const a = .55 + i * .4, cx = Math.sin(a) * .1 * sx, cz = Math.cos(a) * .1 - .01, fim = -.75 - R() * .35;
          cartao(costas.c, daCurva([[cx * .6, .08, cz * .6], [cx * 1.05, .02, cz], [cx * 1.25 + sx * .01, -.1, cz + .02], [cx * 1.35 + sx * .03, -.28, cz + .03], [cx * 1.4 + sx * .04, -.52, cz + .04], [cx * 1.4 + sx * .05, fim, cz + .03]], HC, .04), .075);
        }
      });
      for (let i = 0; i < 13; i++) {
        const a = PI + (i / 12 - .5) * 2.5, sx = Math.sin(a), sz = Math.cos(a), fim = -1.3 - R() * .35;
        cartao(costas.c, daCurva([[sx * .05, .095, sz * .05], [sx * .1, .03, sz * .1], [sx * .12, -.12, sz * .13 - .02], [sx * .14, -.35, sz * .13 - .05], [sx * .17, -.7, sz * .15 - .08], [sx * .2, -1.0, sz * .17 - .12], [sx * .22, fim, sz * .2 - .16]], HC, .04), .075);
      }
      for (let i = 0; i < 18; i++) {
        const a = PI + (i / 17 - .5) * 2.8, sx = Math.sin(a), sz = Math.cos(a), j = (R() - .5) * .05, fim = -1.1 - R() * .5;
        fio(costas.a, daCurva([[sx * .07, .085, sz * .07], [sx * .108, .02, sz * .108], [sx * .125, -.12, sz * .14 - .02], [sx * .145 + j * .3, -.35, sz * .14 - .05], [sx * .18 + j * .6, -.7, sz * .16 - .08], [sx * .21 + j, fim, sz * .19 - .14]], HC, .05), .006 + R() * .003);
      }
      const U2 = T.BufferGeometryUtils;
      const juntaFios = (pai, l) => [[l.a, matCab], [l.c, matCard]].forEach(([lista, m]) => { if (!lista.length) return; const geo = U2 && U2.mergeBufferGeometries(lista); if (geo) { lista.forEach(q => q.dispose()); malha(pai, geo, m); } else lista.forEach(q => malha(pai, q, m)); });
      const cortina = grupo(cab); juntaFios(cortina, frente);
      const nuca = grupo(alto, HC.x, HC.y, HC.z); juntaFios(nuca, costas);
      const gotasCab = pontas.filter((p, i) => i % 3 === 0).map(p => grupo(cortina, p.x, p.y, p.z));

      /* ---------- braços longos, mangas em sino e tiras penduradas ---------- */
      const lados = [-1, 1].map(sx => {
        const br = membro(alto, .35, .33, .034, .027, .021, matPele, { ossudo: .5, seg: 9 });
        br.ombro.position.set(sx * .2, 1.81, -.01);
        const alvo = V(sx * .5, 1.2, .2), polo = V(sx * .4, -.3, -1);
        ik(br, alvo, polo);
        const m = mao(br.punho, matPele, { palma: .09, larg: .062, esp: .022, dedo: 1.6, raio: .008, lado: sx < 0 ? -1 : 1, abrir: .2, matGarra: matUnha, garra: .012 });
        const dA = posEm(br.punho, g).sub(posEm(br.cot, g)).normalize(), dDedo = dA.clone().add(V(0, -.9, 0)).normalize();
        alinharEm(m.g, g, dDedo.clone().negate(), V(-sx, -.2, -.3));
        m.curvar(.35);
        // pontos de gota nas pontas dos dedos
        const gotas = m.dedos.slice(0, 4).map(d => { const ult = d[d.length - 1]; return grupo(ult, 0, -.03, 0); });
        // manga: braço de cima justo e molhado, boca da manga no antebraço
        const ombro = br.ombro.position.clone(), cot = posEm(br.cot, g), pul = posEm(br.punho, g);
        const dirA = pul.clone().sub(cot).normalize();
        const fim = pul.clone().addScaledVector(dirA, .01);
        const geoM = tubo([ombro.clone().add(V(sx * .01, .012, 0)), ombro.clone().lerp(cot, .5), cot, cot.clone().lerp(fim, .5).add(V(0, -.01, 0)), fim.clone().add(V(0, -.02, 0))],
          t => t < .5 ? .044 + t * .016 : .052 + Math.pow((t - .5) * 2, 1.5) * .045, { seg: 24, rad: 14 });
        // pano pesado de água: a parte de baixo da manga cede, e o pano enruga
        const A = cot.clone(), AB = fim.clone().sub(A), L2 = AB.lengthSq();
        deform(geoM, (x, y, z) => { const p = V(x, y, z), pr = p.clone().sub(A).dot(AB) / L2; let dy = 0; if (pr > 0) { const k = Math.min(1, pr), c = A.clone().addScaledVector(AB, k), d = y - c.y; if (d < 0) dy = d * 1.1 * k; } const n = fbm(x * 22, y * 22, z * 22, 2) * .014; return [x + n, y + dy + n * .4, z - n * .8]; });
        malha(corpo, geoM, matManga);
        // cortina de pano que pende de todo o antebraço, mais longa perto do punho, quase até o chão
        const tiras = grupo(corpo, cot.x, cot.y, cot.z), pontasT = [], NC = 9, NRr = 12, pc = [], uvc = [], ic = [];
        const u0 = sx < 0 ? .08 : .55;
        for (let i = 0; i <= NC; i++) {
          const s2 = i / NC, topo = fim.clone().sub(cot).multiplyScalar(s2).add(V(sx * .01, -.045 - s2 * .02, -.025)), comp = .5 + s2 * .55;
          for (let r = 0; r <= NRr; r++) {
            const k = r / NRr, p = topo.clone().add(V(sx * (.02 + k * .06) * (1 + s2 * .5), -comp * k, -.04 * k + Math.sin(k * 3 + s2 * 6) * .018 * k));
            pc.push(p.x, p.y, p.z); uvc.push(u0 + s2 * .32, .42 * (1 - k));
          }
        }
        for (let i = 0; i < NC; i++) for (let r = 0; r < NRr; r++) { const a = i * (NRr + 1) + r, b = a + NRr + 1; ic.push(a, a + 1, b, b, a + 1, b + 1); }
        const geoC = new T.BufferGeometry(); geoC.setAttribute('position', new T.Float32BufferAttribute(pc, 3)); geoC.setAttribute('uv', new T.Float32BufferAttribute(uvc, 2)); geoC.setIndex(ic); geoC.computeVertexNormals();
        malha(tiras, geoC, matVest);
        [.45, .75, 1].forEach(s2 => { const topo = fim.clone().sub(cot).multiplyScalar(s2).add(V(sx * .01, -.045 - s2 * .02, -.025)), comp = .5 + s2 * .55; pontasT.push(grupo(tiras, topo.x + sx * .08 * (1 + s2 * .5), topo.y - comp + .06, topo.z - .04)); });
        return { sx, br, m, alvo, polo, gotas, tiras, pontasT };
      });

      /* ---------- água: poça com ondas, filetes e gotas ---------- */
      const agua = grupo(g);
      const [ca, xa] = tela(256); const ga = xa.createRadialGradient(128, 128, 20, 128, 128, 128);
      ga.addColorStop(0, 'rgba(255,255,255,1)'); ga.addColorStop(.55, 'rgba(255,255,255,.85)'); ga.addColorStop(1, 'rgba(255,255,255,0)');
      xa.fillStyle = ga; xa.beginPath();
      for (let i = 0; i <= 40; i++) { const an = i / 40 * PI * 2, rr = 100 + fbm(Math.cos(an) * 2, Math.sin(an) * 2, 1) * 50 + R() * 6; xa.lineTo(128 + Math.cos(an) * rr, 128 + Math.sin(an) * rr); } xa.fill();
      const matPoca = mat({ color: '#1b2c2e', roughness: .04, metalness: .25, transparent: true, alphaMap: tex(ca), opacity: .92, depthWrite: false, clearcoat: 1, clearcoatRoughness: .05 }, true);
      const poca = malha(agua, new T.CircleGeometry(.95, 48), matPoca); poca.rotation.x = -PI / 2; poca.position.y = .04;
      const ondas = [];
      for (let i = 0; i < 7; i++) {
        const mo = F.guardar(new T.MeshBasicMaterial({ color: new T.Color('#9fd0d6'), transparent: true, opacity: 0, depthWrite: false }));
        const o = malha(agua, new T.RingGeometry(.93, 1, 40), mo); o.rotation.x = -PI / 2; o.position.y = .045;
        ondas.push({ o, mo, t0: -R() * 3, dur: 1.6 + R() * 1.4, tam: .25 + R() * .45, cx: 0, cz: 0 });
      }
      // filetes: escorrem das pontas das tiras e dos dedos até o chão (textura que corre para baixo)
      const [cf, xf] = tela(32, 256); xf.clearRect(0, 0, 32, 256);
      for (let i = 0; i < 26; i++) { const x0 = 4 + R() * 24, y0 = R() * 256, l = 20 + R() * 90; const gf = xf.createLinearGradient(0, y0, 0, y0 + l); gf.addColorStop(0, 'rgba(220,245,250,0)'); gf.addColorStop(.5, 'rgba(220,245,250,.95)'); gf.addColorStop(1, 'rgba(220,245,250,0)'); xf.fillStyle = gf; xf.fillRect(x0, y0, 2 + R() * 4, l); if (y0 + l > 256) xf.fillRect(x0, y0 - 256, 3, l); }
      const texF = tex(cf, [1, 3]);
      const matFilete = F.guardar(new T.MeshStandardMaterial({ color: new T.Color('#cfeff2'), emissive: new T.Color('#1d4a52'), map: texF, transparent: true, opacity: .75, roughness: .05, depthWrite: false }));
      const filetes = [];
      const fonte = (marca, r) => { const me = malha(agua, new T.CylinderGeometry(r, r * 1.6, 1, 6, 1, true), matFilete); filetes.push({ me, marca }); };
      lados.forEach(l => { l.pontasT.forEach((p, k) => { if (k !== 1) fonte(p, .007 + R() * .004); }); fonte(l.gotas[1], .004); });
      // gotas soltas (uma malha instanciada)
      const NG = 70, geoG = new T.SphereGeometry(.011, 6, 4), matG = mat({ color: '#bfe2e6', emissive: '#16363c', roughness: .05, transparent: true, opacity: .85 });
      const gotas = new T.InstancedMesh(F.guardar(geoG), matG, NG); gotas.frustumCulled = false; agua.add(gotas);
      const emis = [...gotasCab]; lados.forEach(l => { emis.push(...l.gotas, ...l.pontasT, ...l.pontasT); });
      const GS = []; for (let i = 0; i < NG; i++) GS.push({ e: i % emis.length, t: -R() * 2, p: V(), v: 0, vivo: false });
      const DM = new T.Matrix4(), DQ = new T.Quaternion(), DS = V(1, 1.9, 1), P0 = V();

      /* ---------- animação ---------- */
      let desl = 0, prox = 0;
      const pos = geoV.attributes.position;
      const anim = (dt, t, andando) => {
        desl += ((andando ? 1 : 0) - desl) * Math.min(1, dt * 2.5);
        // desliza: sobe um pouco, inclina para a frente, sem passos
        corpo.position.y = desl * (.03 + Math.sin(t * 2.1) * .01);
        corpo.rotation.x = desl * .07 + Math.sin(t * .6) * .006;
        corpo.rotation.z = Math.sin(t * .43) * .015;
        // respiração presa: o peito sobe em soluços
        const resp = Math.sin(t * 1.1) * .5 + Math.max(0, Math.sin(t * 3.7)) * .4;
        alto.scale.set(1 + resp * .006, 1 + resp * .004, 1 + resp * .01);
        // cabeça pendida que estala de lado de repente
        const ciclo = (t + 1.3) / 5.3, ph = (ciclo % 1) * 5.3, sinal = Math.floor(ciclo) % 2 ? 1 : -1;
        const tranco = ph < .07 ? ph / .07 : Math.exp(-(ph - .07) * 2.2);
        cab.rotation.set(.3 + tranco * .1 + Math.sin(t * .5) * .03, Math.sin(t * .31) * .1 + tranco * .42 * sinal, .2 + Math.sin(t * .37) * .05 - tranco * .12 * sinal);
        cortina.rotation.x = -cab.rotation.x * .5 + desl * .05; cortina.rotation.z = -cab.rotation.z * .45;
        nuca.rotation.x = desl * .1 + Math.sin(t * .8) * .012; nuca.rotation.z = Math.sin(t * .55) * .01;
        // braços flutuando, dedos tremendo
        lados.forEach((l, i) => {
          const a = l.alvo.clone(); a.y += Math.sin(t * .8 + i * 2) * .025 - desl * .03; a.z += -desl * .08 + Math.sin(t * .6 + i) * .015; a.x += l.sx * desl * .03;
          ik(l.br, a, l.polo);
          const tique = Math.sin(t * 9.3 + i * 4) > .985 ? .5 : 0;
          l.m.curvar([.32 + tique, .38, .42 + tique * .5, .5, .2], .06, t);
          l.tiras.rotation.x = -desl * .22 + Math.sin(t * 1.3 + i) * .035; l.tiras.rotation.z = l.sx * (desl * .06 + Math.sin(t * 1.1 + i * 2) * .025);
        });
        saia.rotation.y = Math.sin(t * .7) * .02; saia.position.z = -desl * .015;
        // barra do vestido ondulando (e arrastando para trás ao deslizar)
        for (let k = 0; k < pos.count; k++) {
          const bx = baseV[k * 3], by = baseV[k * 3 + 1], bz = baseV[k * 3 + 2];
          if (by > .75) continue;
          const f = 1 - by / .75, an = Math.atan2(bx, bz), o = Math.sin(an * 5 + t * 1.6 + by * 5) * .014 * f + Math.sin(an * 11 - t * 2.3) * .006 * f;
          pos.setXYZ(k, bx * (1 + o), by, bz * (1 + o) - desl * .1 * f * f);
        }
        pos.needsUpdate = true; geoV.computeVertexNormals();
        nuc.pulso(t);
        brOlho.material.opacity = .5 + .3 * Math.sin(t * 2.3);
        // filetes presos às marcas, do ponto até o chão, correndo
        texF.offset.y = (texF.offset.y + dt * 2.2) % 1;
        filetes.forEach(f2 => { posEm(f2.marca, g, P0); const h = Math.max(.05, P0.y - .04); f2.me.position.set(P0.x, .04 + h / 2, P0.z); f2.me.scale.set(1, h, 1); });
        // gotas: caem, viram onda na poça e renascem
        GS.forEach((d, i) => {
          if (!d.vivo) { d.t += dt; if (d.t > 0) { posEm(emis[d.e], g, d.p); d.v = 0; d.vivo = true; } else { DM.makeScale(0, 0, 0); gotas.setMatrixAt(i, DM); return; } }
          d.v += 9.8 * dt; d.p.y -= d.v * dt;
          if (d.p.y < .05) {
            d.vivo = false; d.t = -R() * 1.4 - .2;
            if (t > prox) { const o = ondas.find(q => t - q.t0 > q.dur); if (o) { o.t0 = t; o.cx = d.p.x; o.cz = d.p.z; o.tam = .18 + R() * .35; prox = t + .15; } }
          }
          DM.compose(d.p, DQ, DS); gotas.setMatrixAt(i, DM);
        });
        gotas.instanceMatrix.needsUpdate = true;
        ondas.forEach(o => { const k = (t - o.t0) / o.dur; if (k < 0 || k > 1) { o.mo.opacity = 0; return; } o.o.position.set(o.cx, .045, o.cz); o.o.scale.setScalar(.03 + k * o.tam); o.mo.opacity = (1 - k) * .45; });
      };
      // primeira pose antes do primeiro quadro
      anim(0, 0, false);
      return { g, alt: 2.32, raioBase: .5, anim };
    },
  };
})();

/* ===== forma: aranha_gaiola ===== */
/* Forma de Filho: aranha de gaiola.
   Gaiola de passarinho ornamentada e enferrujada, como uma lanterna, com panos cinzentos rasgados por
   cima e uma luz quente lá dentro, pendurada no teto por correntes. Dela saem oito pernas finíssimas
   de osso e metal, com juntas altas perto do teto, que descem até o chão terminando em espetos.
   Anda perna por perna. */
(() => {
  const NS = window.ACF3D = window.ACF3D || {};
  (NS.formasFilho = NS.formasFilho || {}).aranha_gaiola = {
    nome: 'Aranha de gaiola (pendurada no teto)',
    criar: (F, s) => {
      const T = F.T, g = F.G(), guardar = F.guardar, rng = F.rng || NS.rng, tela = F.tela || NS.tela;
      const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z), CIMA = V3(0, 1, 0);
      const mat = o => guardar(new T.MeshStandardMaterial(o));
      const R = rng(707);
      const TETO = 4.0, CENTRO = 3.0;

      /* ================= utilidades ================= */
      function tubo(pts, raio, seg = 12, rad = 6, fechado = false) {
        const curva = new T.CatmullRomCurve3(pts, fechado), q = new T.TubeGeometry(curva, seg, 1, rad, fechado);
        const p = q.attributes.position, c = V3(), v = V3();
        for (let i = 0; i <= seg; i++) { curva.getPointAt(Math.min(1, i / seg), c); const k = typeof raio === 'function' ? raio(i / seg) : raio; for (let j = 0; j <= rad; j++) { const n = i * (rad + 1) + j; v.fromBufferAttribute(p, n).sub(c).multiplyScalar(k).add(c); p.setXYZ(n, v.x, v.y, v.z); } }
        return q;
      }
      function torno(perfil, n, rad, phi0 = 0, phiL = Math.PI * 2) { const pts = []; for (let i = 0; i <= n; i++) { const [r, y] = perfil(i / n); pts.push(new T.Vector2(Math.max(.001, r), y)); } return new T.LatheGeometry(pts, rad, phi0, phiL); }
      function juntar(lista) {
        let nv = 0, ni = 0; lista.forEach(q => { nv += q.attributes.position.count; ni += q.index.count; });
        const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni), out = new T.BufferGeometry(); let ov = 0, oi = 0;
        lista.forEach(q => { if (!q.attributes.normal) q.computeVertexNormals(); pos.set(q.attributes.position.array, ov * 3); nor.set(q.attributes.normal.array, ov * 3); if (q.attributes.uv) uv.set(q.attributes.uv.array, ov * 2); const ix = q.index.array; for (let k = 0; k < ix.length; k++) idx[oi + k] = ix[k] + ov; oi += ix.length; ov += q.attributes.position.count; q.dispose(); });
        out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nor, 3)); out.setAttribute('uv', new T.BufferAttribute(uv, 2)); out.setIndex(new T.BufferAttribute(idx, 1)); out.computeBoundingSphere();
        return guardar(out);
      }
      const tique = (t, per, dur, fase = 0) => { const p = ((t + fase) % per) / dur; return p < 1 ? Math.sin(p * Math.PI) : 0; };

      /* ================= texturas ================= */
      // ferro enferrujado
      const tFerro = (() => {
        const N = 256, [c, x] = tela(N, N), r = rng(3);
        x.fillStyle = '#4a3324'; x.fillRect(0, 0, N, N);
        for (let i = 0; i < 160; i++) { const x0 = r() * N, y0 = r() * N, rr = 4 + r() * 22, gr = x.createRadialGradient(x0, y0, 0, x0, y0, rr); gr.addColorStop(0, `rgba(${150 + r() * 50 | 0},${70 + r() * 30 | 0},${25},${.25 + r() * .35})`); gr.addColorStop(1, 'rgba(120,60,20,0)'); x.fillStyle = gr; x.fillRect(x0 - rr, y0 - rr, rr * 2, rr * 2); }
        for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(${r() < .5 ? '20,12,8' : '170,140,110'},${r() * .2})`; x.fillRect(r() * N, r() * N, 1 + r() * 2, 1 + r() * 2); }
        for (let i = 0; i < 25; i++) { const x0 = r() * N, gr = x.createLinearGradient(0, 0, 0, N); gr.addColorStop(0, 'rgba(140,70,25,0)'); gr.addColorStop(.5, 'rgba(140,70,25,.35)'); gr.addColorStop(1, 'rgba(140,70,25,0)'); x.fillStyle = gr; x.fillRect(x0, 0, 1 + r() * 3, N); }
        const t = F.texCanvas(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
      })();
      // osso velho com veios, manchas de ferrugem e sujeira (ao longo do comprimento)
      const tOsso = (() => {
        const [c, x] = tela(128, 512), r = rng(9);
        const gr = x.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#5e5246'); gr.addColorStop(.3, '#8c8070'); gr.addColorStop(.7, '#7c7062'); gr.addColorStop(1, '#4a3e34'); x.fillStyle = gr; x.fillRect(0, 0, 128, 512);
        for (let i = 0; i < 90; i++) { x.strokeStyle = `rgba(${r() < .5 ? '40,30,24' : '200,190,170'},${.08 + r() * .14})`; x.lineWidth = .5 + r() * 1.5; const x0 = r() * 128; x.beginPath(); x.moveTo(x0, r() * 512); x.lineTo(x0 + (r() - .5) * 6, r() * 512); x.stroke(); }
        for (let i = 0; i < 30; i++) { const x0 = r() * 128, y0 = r() * 512, L = 20 + r() * 120, g2 = x.createLinearGradient(0, y0, 0, y0 + L); g2.addColorStop(0, 'rgba(130,60,22,.55)'); g2.addColorStop(1, 'rgba(130,60,22,0)'); x.fillStyle = g2; x.fillRect(x0, y0, 2 + r() * 6, L); }
        for (let i = 0; i < 4; i++) { const y0 = r() * 512; x.fillStyle = 'rgba(25,18,12,.3)'; x.beginPath(); x.moveTo(0, y0); x.lineTo(128, y0 + (r() - .5) * 30); x.lineTo(128, y0 + 3); x.lineTo(0, y0 + 2); x.fill(); }
        for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(20,14,10,${.2 + r() * .3})`; x.beginPath(); x.ellipse(r() * 128, r() * 512, 1 + r() * 3, 2 + r() * 8, 0, 0, 7); x.fill(); } // poros e lascas
        const t = F.texCanvas(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
      })();
      // faixa de arabescos vazados (transparência)
      const tFiligrana = (() => {
        const W = 512, H = 64, [c, x] = tela(W, H);
        x.strokeStyle = '#6a4630'; x.lineWidth = 5; x.lineCap = 'round';
        x.beginPath(); x.moveTo(0, 5); x.lineTo(W, 5); x.moveTo(0, H - 5); x.lineTo(W, H - 5); x.stroke();
        x.lineWidth = 4;
        for (let i = 0; i < 16; i++) { const cx0 = i * 32 + 16; x.beginPath(); x.arc(cx0 - 6, H / 2, 10, Math.PI * .2, Math.PI * 1.7); x.stroke(); x.beginPath(); x.arc(cx0 + 6, H / 2, 10, Math.PI * 1.2, Math.PI * 2.7); x.stroke(); x.beginPath(); x.moveTo(cx0, 5); x.lineTo(cx0, H - 5); x.stroke(); x.beginPath(); x.arc(cx0 + 16, 12, 5, 0, 7); x.stroke(); x.beginPath(); x.arc(cx0 + 16, H - 12, 5, 0, 7); x.stroke(); }
        x.globalCompositeOperation = 'source-atop'; const r = rng(4);
        for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(${150 + r() * 60 | 0},${70 + r() * 30 | 0},25,${r() * .6})`; x.fillRect(r() * W, r() * H, 3, 3); }
        const t = F.texCanvas(c); t.wrapS = T.RepeatWrapping; return t;
      })();
      // pano cinzento sujo e rasgado, com a barra esfiapada (transparência)
      const tPano = (() => {
        const W = 256, H = 512, [c, x] = tela(W, H), r = rng(21);
        x.fillStyle = '#8c877e'; x.beginPath(); x.moveTo(0, 0); x.lineTo(W, 0);
        for (let k = 0; k <= 20; k++) x.lineTo(W - k * W / 20, H * (.55 + r() * .4) * (k % 3 ? 1 : .85));
        x.closePath(); x.fill();
        x.globalCompositeOperation = 'source-atop';
        for (let i = 0; i < 220; i++) { x.fillStyle = `rgba(${r() < .5 ? '40,36,30' : '200,195,185'},${r() * .1})`; x.fillRect(r() * W, r() * H, 1 + r() * 3, 10 + r() * 50); }
        for (let i = 0; i < 14; i++) { const gr = x.createRadialGradient(0, 0, 1, 0, 0, 40); gr.addColorStop(0, 'rgba(60,45,30,.55)'); gr.addColorStop(1, 'rgba(60,45,30,0)'); x.save(); x.translate(r() * W, r() * H); x.scale(1, 1 + r() * 3); x.fillStyle = gr; x.fillRect(-60, -60, 120, 120); x.restore(); }
        const g2 = x.createLinearGradient(0, 0, 0, H); g2.addColorStop(0, 'rgba(30,25,20,.0)'); g2.addColorStop(1, 'rgba(30,25,20,.55)'); x.fillStyle = g2; x.fillRect(0, 0, W, H);
        x.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 10; i++) { const x0 = r() * W, y0 = 60 + r() * H * .5; x.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283, d = (5 + r() * 14) * (.6 + r() * .6); x.lineTo(x0 + Math.cos(a) * d, y0 + Math.sin(a) * d * 2.2); } x.fill(); }
        for (let i = 0; i < 7; i++) { const x0 = r() * W, y0 = H * (.4 + r() * .3); x.fillRect(x0, y0, 2 + r() * 4, H); }
        x.globalCompositeOperation = 'source-over';
        return F.texCanvas(c);
      })();

      const mFerro = mat({ color: '#c8b8a8', map: tFerro, roughness: .62, metalness: .65 });
      const mFerroE = mat({ color: '#a89888', map: tFerro, roughness: .7, metalness: .55 });
      const mFil = mat({ color: '#d0c0b0', map: tFiligrana, alphaTest: .5, side: T.DoubleSide, roughness: .6, metalness: .6 });
      const mOsso = mat({ color: '#ffffff', map: tOsso, roughness: .55, metalness: .35 });
      const mJunta = mat({ color: '#6a5a4a', map: tFerro, roughness: .45, metalness: .7 });
      const mPano = mat({ color: '#8a857c', map: tPano, alphaTest: .5, side: T.DoubleSide, roughness: .95, emissive: '#2a1a08', emissiveMap: tPano, emissiveIntensity: .6 });

      /* ================= a gaiola (pendurada; o pivô é o ponto no teto) ================= */
      const corpo = F.G(); corpo.position.y = TETO; g.add(corpo);
      const Y = y => y - TETO;
      // perfil da gaiola: raio por altura
      const perfil = [[2.3, .03], [2.38, .1], [2.48, .2], [2.6, .32], [2.78, .41], [3.0, .45], [3.22, .43], [3.38, .36], [3.5, .24], [3.58, .12], [3.63, .04]];
      const raioEm = y => { for (let i = 1; i < perfil.length; i++) if (y <= perfil[i][0]) { const [y0, r0] = perfil[i - 1], [y1, r1] = perfil[i]; const u = (y - y0) / (y1 - y0); return r0 + (r1 - r0) * (u * u * (3 - 2 * u)); } return .03; };
      // barras verticais
      { const lista = [], nB = 30;
        for (let i = 0; i < nB; i++) { const a = i / nB * 6.283, pts = []; for (let y = 2.56; y <= 3.5; y += .08) { const r0 = raioEm(y); pts.push(V3(Math.sin(a) * r0, Y(y), Math.cos(a) * r0)); } lista.push(tubo(pts, .009, 14, 4)); }
        corpo.add(new T.Mesh(juntar(lista), mFerro)); }
      // anéis horizontais e faixas de arabesco
      { const lista = [];
        [2.56, 2.7, 2.98, 3.02, 3.3, 3.48].forEach(y => { const tq = new T.TorusGeometry(raioEm(y) + .006, y === 2.98 || y === 3.02 ? .016 : .011, 6, 48); tq.rotateX(Math.PI / 2); tq.translate(0, Y(y), 0); lista.push(tq); });
        corpo.add(new T.Mesh(juntar(lista), mFerro));
        [[2.58, 2.68], [3.32, 3.46]].forEach(([y0, y1]) => { const q = torno(t => [raioEm(y0 + (y1 - y0) * t) + .012, Y(y0 + (y1 - y0) * t)], 4, 40); const uv = q.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 4); corpo.add(new T.Mesh(guardar(q), mFil)); }); }
      // fundo em bacia ornamentada e o domo, com pingente e argola
      { const base = torno(t => { const y = 2.3 + t * .28; return [raioEm(y) * (1 + .06 * Math.sin(t * 30)), Y(y)]; }, 16, 32);
        const domo = torno(t => { const y = 3.46 + t * .17; return [raioEm(y) + .005, Y(y)]; }, 8, 32);
        const pend = torno(t => [.035 * Math.sin(t * Math.PI) + .01, Y(2.18 + t * .14)], 8, 12);
        const argola = new T.TorusGeometry(.045, .011, 6, 18); argola.translate(0, Y(2.13), 0);
        const topo = new T.TorusGeometry(.05, .014, 6, 18); topo.translate(0, Y(3.7), 0);
        const haste = new T.CylinderGeometry(.015, .02, .08, 8); haste.translate(0, Y(3.65), 0);
        corpo.add(new T.Mesh(juntar([base, domo, pend, argola, topo, haste]), mFerroE)); }
      // correntes subindo até o teto
      { const lista = [];
        const corrente = (a, b) => { const d = b.clone().sub(a), L = d.length(), n = Math.floor(L / .05); d.normalize(); const q0 = new T.Quaternion().setFromUnitVectors(V3(0, 1, 0), d);
          for (let i = 0; i < n; i++) { const el = new T.TorusGeometry(.024, .006, 4, 10); el.scale(.7, 1.3, 1); if (i % 2) el.rotateY(Math.PI / 2); el.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(q0)); const p = a.clone().addScaledVector(d, (i + .5) * L / n); el.translate(p.x, p.y, p.z); lista.push(el); } };
        corrente(V3(0, Y(3.72), 0), V3(0, 0, 0));
        [0, 2.1, 4.2].forEach(a => corrente(V3(Math.sin(a) * .36, Y(3.36), Math.cos(a) * .36), V3(Math.sin(a + .3) * .55, 0, Math.cos(a + .3) * .55)));
        // placa de fixação no teto
        const placa = new T.CylinderGeometry(.12, .14, .03, 12); placa.translate(0, -.015, 0); lista.push(placa);
        corpo.add(new T.Mesh(juntar(lista), mFerroE)); }

      // luz quente dentro: brasa/lamparina, halo e uma luz fraca que tremula
      const mLuz = mat({ color: '#ffd8a0', emissive: '#ffb050', emissiveIntensity: 1.6, roughness: .5 });
      const chama = new T.Mesh(guardar(new T.SphereGeometry(.16, 18, 14)), mLuz); chama.scale.set(1, 1.3, 1); chama.position.y = Y(3.0); corpo.add(chama);
      const [cH, xH] = tela(128, 128); { const gr = xH.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,220,160,.95)'); gr.addColorStop(.35, 'rgba(255,170,80,.35)'); gr.addColorStop(1, 'rgba(255,140,40,0)'); xH.fillStyle = gr; xH.fillRect(0, 0, 128, 128); }
      const halo = new T.Sprite(guardar(new T.SpriteMaterial({ map: F.texCanvas(cH), blending: T.AdditiveBlending, depthWrite: false, transparent: true }))); halo.scale.set(1.3, 1.6, 1); halo.position.y = Y(3.0); corpo.add(halo);
      const luz = new T.PointLight('#ffb470', .9, 7, 2); luz.position.y = Y(2.95); corpo.add(luz);

      // panos cinzentos jogados por cima da gaiola, caindo em tiras
      const panos = [];
      [[.2, .75], [1.3, .45], [2.6, .7], [4.0, .55], [5.2, .5]].forEach(([a0, L], k) => {
        const piv = F.G(); piv.position.y = Y(3.6); corpo.add(piv);
        const comp = 1.0 + (k % 3) * .3; const q = torno(t => { const y = 3.62 - t * comp; return [y > 3.0 ? raioEm(y) + .03 + k * .004 : .48 + k * .004 + (3.0 - y) * .05, y - 3.62]; }, 22, 10, a0, L);
        const p = q.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = Math.sin(Math.atan2(x, z) * 9 + k) * .025 * Math.min(1, -y); p.setXYZ(i, x * (1 + d), y, z * (1 + d)); }
        q.computeVertexNormals();
        const uvP = q.attributes.uv; for (let i = 0; i < uvP.count; i++) uvP.setY(i, 1 - uvP.getY(i)); // barra rasgada embaixo
        piv.add(new T.Mesh(guardar(q), mPano)); piv.rotation.y = k * .3; panos.push({ piv, f: k * 1.7, z0: (k % 2 ? 1 : -1) * .12 });
      });

      /* ================= núcleo roxo na base da gaiola (moldura de aranha) ================= */
      const nucleo = (() => {
        const ng = F.G(); const yN = 2.42, rN = raioEm(yN); ng.position.set(0, Y(yN) - .01, rN * .9); ng.rotation.x = .75; corpo.add(ng);
        const mNuc = mat({ color: '#5a20b0', emissive: '#9a38ff', emissiveIntensity: 2.2, roughness: .15 });
        ng.add(new T.Mesh(guardar(new T.SphereGeometry(.055, 18, 14)), mNuc));
        const pecas = [new T.TorusGeometry(.072, .013, 6, 24)];
        for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; pecas.push(tubo([V3(Math.cos(a) * .07, Math.sin(a) * .07, 0), V3(Math.cos(a) * .12, Math.sin(a) * .12, .035), V3(Math.cos(a) * .17, Math.sin(a) * .17, .01), V3(Math.cos(a) * .2, Math.sin(a) * .2, -.04)], t => .01 * (1 - t) + .002, 8, 4)); }
        ng.add(new T.Mesh(juntar(pecas), mat({ color: '#18121a', roughness: .3, metalness: .8 })));
        const [c, x] = tela(64, 64), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(210,140,255,.95)'); gr.addColorStop(.3, 'rgba(150,60,255,.4)'); gr.addColorStop(1, 'rgba(90,0,200,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
        const hl = new T.Sprite(guardar(new T.SpriteMaterial({ map: F.texCanvas(c), blending: T.AdditiveBlending, depthWrite: false, transparent: true }))); hl.scale.set(.45, .45, 1); hl.position.z = .04; ng.add(hl);
        return { mNuc, hl };
      })();

      /* ================= oito pernas compridas (osso e metal) ================= */
      // segmento de comprimento 1 ao longo de +y (escala no comprimento), com nós nas pontas
      const qSeg = (r0, r1, n = 12) => guardar(torno(t => [(r0 + (r1 - r0) * t) * (1 + .35 * Math.exp(-((t - .04) ** 2) / .002) + .25 * Math.exp(-((t - .96) ** 2) / .002)), t], n, 7));
      const qFemur = qSeg(.05, .036), qTibia = qSeg(.036, .026), qEspeto = guardar(torno(t => [.026 * (1 - t) ** 1.3 + .001, t], 10, 6));
      const qJunta = guardar(new T.SphereGeometry(.055, 10, 8)), qPino = guardar(new T.CylinderGeometry(.018, .018, .16, 8));
      const pernas = [];
      const ANG = [.45, .95, 1.55, 2.25];
      [-1, 1].forEach(sx => ANG.forEach((a, i) => {
        const ang = sx * a + (R() - .5) * .08;
        const hip = V3(Math.sin(ang) * .45, Y(3.02 + (i % 2) * .05), Math.cos(ang) * .45); // no espaço da gaiola
        const ombro = V3(Math.sin(ang) * .78, Y(3.32), Math.cos(ang) * .78);
        const raioPe = 2.25 + (i === 0 || i === 3 ? .2 : 0) + R() * .15;
        const pe0 = V3(Math.sin(ang * 1.02) * raioPe, 0, Math.cos(ang * 1.02) * raioPe);
        const me = { coxa: new T.Mesh(qFemur, mOsso), femur: new T.Mesh(qFemur, mOsso), tibia: new T.Mesh(qTibia, mOsso), espeto: new T.Mesh(qEspeto, mOsso),
          j1: new T.Mesh(qJunta, mJunta), j2: new T.Mesh(qJunta, mJunta), j3: new T.Mesh(qJunta, mJunta), pino: new T.Mesh(qPino, mJunta) };
        Object.values(me).forEach(o => g.add(o)); me.j3.scale.setScalar(.7);
        pernas.push(Object.assign(me, { hip, ombro, pe0, alvo: pe0.clone(), H: V3(), O: V3(), K: V3(), A: V3(), ang, sx, i }));
      }));
      const ORDEM = [0, 5, 2, 7, 4, 1, 6, 3];
      pernas.forEach((p, k) => { p.ordem = ORDEM.indexOf(pernas.indexOf(p)); });
      const ligar = (o, a, b) => { o.position.copy(a); const d = V3().subVectors(b, a); const L = d.length(); o.quaternion.setFromUnitVectors(CIMA, d.multiplyScalar(1 / L)); o.scale.set(1, L, 1); };

      /* ================= animação ================= */
      let fase = 0, kAnda = 0;
      const tmp = V3(), perp = V3();
      const anim = (dt, t, andando) => {
        kAnda += ((andando ? 1 : 0) - kAnda) * Math.min(1, dt * 3);
        fase += dt / 2.6 * kAnda;
        // gaiola balança presa às correntes, mais quando anda
        corpo.rotation.x = Math.sin(t * .9) * .025 + Math.sin(fase * 6.283 * 8) * .02 * kAnda + kAnda * .04;
        corpo.rotation.z = Math.sin(t * .7 + 1) * .03 + tique(t, 7.3, .6, 1) * .05;
        corpo.rotation.y = Math.sin(t * .23) * .08;
        corpo.updateMatrix();
        // luz tremulando como lamparina, às vezes quase apaga
        const pisca = .78 + .14 * Math.sin(t * 9 + Math.sin(t * 23)) + .08 * Math.sin(t * 31) - tique(t, 6.7, .25, 2) * .6;
        luz.intensity = .9 * pisca; mLuz.emissiveIntensity = 1.6 * pisca; halo.material.opacity = .55 + .45 * pisca;
        panos.forEach(pn => { pn.piv.rotation.x = Math.sin(t * .8 + pn.f) * .03; pn.piv.rotation.z = pn.z0 + Math.sin(t * .6 + pn.f * 2) * .03; });
        // pernas: uma de cada vez, levanta alto e crava o espeto no chão
        pernas.forEach((p, k) => {
          const passo = .55, janela = 1 / 8, ini = p.ordem * janela;
          let u = ((fase - ini) % 1 + 1) % 1, dz = 0, dy = 0, dx = 0;
          if (u < janela) { const v = u / janela, e = v * v * (3 - 2 * v); dz = passo * (-.5 + e); dy = Math.sin(v * Math.PI) * .7 + (v > .8 ? -.05 : 0); dx = Math.sin(v * Math.PI) * .25 * p.sx * 0; }
          else dz = passo * (.5 - (u - janela) / (1 - janela));
          dz *= kAnda; dy *= kAnda;
          // parada: de vez em quando uma perna bate a ponta no chão, como dedos tamborilando
          const toque = tique(t, 3.3 + k * .41, .35, k * 1.37) * (1 - kAnda);
          p.alvo.set(p.pe0.x + dx, dy + toque * .28, p.pe0.z + dz);
          p.H.copy(p.hip).applyMatrix4(corpo.matrix); p.O.copy(p.ombro).applyMatrix4(corpo.matrix);
          // joelho alto, quase no teto: fica entre o ombro e o pé, puxado para cima; sobe quando a perna levanta
          tmp.set(p.alvo.x - p.O.x, 0, p.alvo.z - p.O.z);
          p.K.copy(p.O).addScaledVector(tmp, .52); p.K.y = Math.min(TETO - .1, p.O.y + .46 + (dy + toque * .28) * .25);
          // tornozelo: a 58% da canela, com uma dobra para fora
          tmp.subVectors(p.alvo, p.K); perp.set(p.alvo.x, 0, p.alvo.z).normalize();
          p.A.copy(p.K).addScaledVector(tmp, .58).addScaledVector(perp, .22).y += .12;
          ligar(p.coxa, p.H, p.O); ligar(p.femur, p.O, p.K); ligar(p.tibia, p.K, p.A); ligar(p.espeto, p.A, p.alvo);
          p.j1.position.copy(p.O); p.j2.position.copy(p.K); p.j3.position.copy(p.A);
          p.pino.position.copy(p.K); p.pino.quaternion.setFromUnitVectors(CIMA, perp.set(-p.alvo.z, 0, p.alvo.x).normalize());
        });
        const pu = Math.pow(.5 + .5 * Math.sin(t * 1.25), 3);
        nucleo.mNuc.emissiveIntensity = 1.4 + pu * 2.4; nucleo.hl.material.opacity = .45 + pu * .55;
      };
      anim(0, 0, false);
      return { g, alt: 3.9, raioBase: .6, anim };
    },
  };
})();

/* ===== forma: bracos_rastejante ===== */
/* Forma de Filho: rastejante de muitos braços.
   Massa baixa e comprida coberta por uma mortalha cinzenta rasgada, com um capuz na frente onde só
   aparecem dois olhos pálidos. Por baixo, dezenas de braços cinza-escuros cheios de tendões, com
   pulseiras e anéis de ouro e garras de ponta dourada, se arrastam em onda; alguns braços passam por
   cima das costas e puxam o corpo para a frente. Baixo e comprido, rente ao chão. */
(() => {
  const NS = window.ACF3D = window.ACF3D || {};
  (NS.formasFilho = NS.formasFilho || {}).bracos_rastejante = {
    nome: 'Rastejante de muitos braços (mortalha)',
    criar: (F, s) => {
      const T = F.T, g = F.G(), guardar = F.guardar, rng = F.rng || NS.rng, tela = F.tela || NS.tela;
      const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z), CIMA = V3(0, 1, 0);
      const mat = o => guardar(new T.MeshStandardMaterial(o));
      const R = rng(1414);

      /* ================= utilidades ================= */
      const ruido = (x, y, z, k = 0) => Math.sin(1.7 * x + 1.3 * y + k) * Math.sin(1.9 * y - 1.1 * z + 2 * k) * Math.sin(1.3 * z + .7 * x + 3 * k)
        + .5 * Math.sin(3.1 * x - 2.3 * z + k) * Math.sin(2.9 * y + 1.7 * x - k);
      function amassar(q, amp, freq, k) {
        const p = q.attributes.position, nn = q.attributes.normal;
        for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = ruido(x * freq, y * freq, z * freq, k) * amp; p.setXYZ(i, x + nn.getX(i) * d, y + nn.getY(i) * d, z + nn.getZ(i) * d); }
        q.computeVertexNormals(); return q;
      }
      function tubo(pts, raio, seg = 10, rad = 6) {
        const curva = new T.CatmullRomCurve3(pts), q = new T.TubeGeometry(curva, seg, 1, rad, false);
        const p = q.attributes.position, c = V3(), v = V3();
        for (let i = 0; i <= seg; i++) { curva.getPointAt(i / seg, c); const k = typeof raio === 'function' ? raio(i / seg) : raio; for (let j = 0; j <= rad; j++) { const n = i * (rad + 1) + j; v.fromBufferAttribute(p, n).sub(c).multiplyScalar(k).add(c); p.setXYZ(n, v.x, v.y, v.z); } }
        return q;
      }
      function torno(L, perfil, rad = 8, n = 10) { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new T.Vector2(Math.max(.002, perfil(t)), t * L)); } return new T.LatheGeometry(pts, rad); }
      // junta geometrias com grupos de material ([geometria, grupo])
      function juntar(lista) {
        lista.sort((a, b) => a[1] - b[1]);
        let nv = 0, ni = 0; lista.forEach(([q]) => { nv += q.attributes.position.count; ni += q.index.count; });
        const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni), out = new T.BufferGeometry(); let ov = 0, oi = 0, gr = -1, ini = 0;
        lista.forEach(([q, grupo]) => { if (!q.attributes.normal) q.computeVertexNormals(); pos.set(q.attributes.position.array, ov * 3); nor.set(q.attributes.normal.array, ov * 3); if (q.attributes.uv) uv.set(q.attributes.uv.array, ov * 2);
          if (grupo !== gr) { if (gr >= 0) out.addGroup(ini, oi - ini, gr); gr = grupo; ini = oi; }
          const ix = q.index.array; for (let k = 0; k < ix.length; k++) idx[oi + k] = ix[k] + ov; oi += ix.length; ov += q.attributes.position.count; q.dispose(); });
        out.addGroup(ini, oi - ini, gr);
        out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nor, 3)); out.setAttribute('uv', new T.BufferAttribute(uv, 2)); out.setIndex(new T.BufferAttribute(idx, 1)); out.computeBoundingSphere();
        return guardar(out);
      }
      function ik(H, P, a, b, polo, out) {
        const d = P.clone().sub(H); let L = d.length(); L = Math.min(Math.max(L, Math.abs(a - b) + .01), a + b - .001);
        d.normalize(); const x = (a * a - b * b + L * L) / (2 * L), h = Math.sqrt(Math.max(0, a * a - x * x));
        const pp = polo.clone().sub(d.clone().multiplyScalar(polo.dot(d))).normalize();
        return out.copy(H).addScaledVector(d, x).addScaledVector(pp, h);
      }
      const tique = (t, per, dur, fase = 0) => { const p = ((t + fase) % per) / dur; return p < 1 ? Math.sin(p * Math.PI) : 0; };

      /* ================= texturas ================= */
      // pele cinza-escura de tendões (fibras ao longo do braço)
      const tPele = (() => {
        const W = 256, H = 512, [c, x] = tela(W, H), [cb, xb] = tela(W, H), r = rng(8);
        x.fillStyle = '#28282a'; x.fillRect(0, 0, W, H); xb.fillStyle = '#808080'; xb.fillRect(0, 0, W, H);
        for (let i = 0; i < 260; i++) { const x0 = r() * W, w = 1 + r() * 4, y0 = r() * H * .3, L = H * (.4 + r() * .7), cl = r() < .55; x.strokeStyle = cl ? `rgba(140,142,146,${.04 + r() * .09})` : `rgba(5,5,6,${.15 + r() * .25})`; x.lineWidth = w; x.beginPath(); x.moveTo(x0, y0); x.bezierCurveTo(x0 + (r() - .5) * 20, y0 + L * .3, x0 + (r() - .5) * 20, y0 + L * .6, x0 + (r() - .5) * 12, y0 + L); x.stroke(); xb.strokeStyle = cl ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.4)'; xb.lineWidth = w; xb.stroke(); }
        for (let i = 0; i < 7; i++) { const y0 = r() * H; x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1 + r() * 2; x.beginPath(); x.moveTo(0, y0); for (let k = 0; k <= 8; k++) x.lineTo(k * W / 8, y0 + (r() - .5) * 8); x.stroke(); }
        const map = F.texCanvas(c), bump = F.texCanvas(cb); bump.encoding = T.LinearEncoding; return { map, bump };
      })();
      // ouro gravado (pulseiras e anéis)
      const tOuro = (() => {
        const [c, x] = tela(256, 64), r = rng(2);
        const gr = x.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#7a5a1c'); gr.addColorStop(.25, '#e8c46a'); gr.addColorStop(.5, '#b8902e'); gr.addColorStop(.8, '#e0b858'); gr.addColorStop(1, '#6a4a14'); x.fillStyle = gr; x.fillRect(0, 0, 256, 64);
        x.strokeStyle = 'rgba(60,35,5,.8)'; x.lineWidth = 2;
        for (let i = 0; i < 16; i++) { const cx0 = i * 16 + 8; x.beginPath(); x.arc(cx0, 32, 6, 0, 7); x.stroke(); x.beginPath(); x.moveTo(cx0 - 8, 14); x.lineTo(cx0 + 8, 14); x.moveTo(cx0 - 8, 50); x.lineTo(cx0 + 8, 50); x.stroke(); }
        for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(${r() < .5 ? '40,25,5' : '255,240,190'},${r() * .2})`; x.fillRect(r() * 256, r() * 64, 2, 2); }
        const t = F.texCanvas(c); t.wrapS = T.RepeatWrapping; return t;
      })();
      // mortalha cinzenta, suja e rasgada (transparência na barra e nos furos)
      const tMort = (() => {
        const N = 512, [c, x] = tela(N, N), r = rng(13);
        x.fillStyle = '#77736c'; x.fillRect(0, 0, N, N * .6);
        // barra rasgada em tiras compridas
        x.beginPath(); x.moveTo(0, N * .55);
        for (let k = 0; k <= 32; k++) { const xx = k * N / 32; x.lineTo(xx, N * (.6 + r() * .38) * (k % 2 ? 1 : .9)); }
        x.lineTo(N, N * .55); x.closePath(); x.fill();
        x.globalCompositeOperation = 'source-atop';
        for (let i = 0; i < 36; i++) { const x0 = r() * N, gr = x.createLinearGradient(x0 - 12, 0, x0 + 12, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, `rgba(${r() < .5 ? '20,18,16' : '190,185,175'},${.15 + r() * .2})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(x0 - 12, 0, 24, N); }
        for (let i = 0; i < 1600; i++) { x.fillStyle = `rgba(${r() < .5 ? '30,28,25' : '170,165,155'},${r() * .12})`; x.fillRect(r() * N, r() * N, 1 + r() * 2, 3 + r() * 10); }
        for (let i = 0; i < 18; i++) { const gr = x.createRadialGradient(0, 0, 1, 0, 0, 50); gr.addColorStop(0, 'rgba(25,20,16,.55)'); gr.addColorStop(1, 'rgba(25,20,16,0)'); x.save(); x.translate(r() * N, r() * N); x.scale(1, 1 + r() * 2); x.fillStyle = gr; x.fillRect(-70, -70, 140, 140); x.restore(); }
        const g2 = x.createLinearGradient(0, 0, 0, N); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(10,8,6,.6)'); x.fillStyle = g2; x.fillRect(0, 0, N, N);
        x.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 14; i++) { const x0 = r() * N, y0 = N * (.15 + r() * .45); x.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283, d = (5 + r() * 16) * (.6 + r() * .6); x.lineTo(x0 + Math.cos(a) * d, y0 + Math.sin(a) * d * 1.8); } x.fill(); }
        for (let i = 0; i < 12; i++) x.fillRect(r() * N, N * (.45 + r() * .2), 2 + r() * 5, N);
        x.globalCompositeOperation = 'source-over';
        const t = F.texCanvas(c); t.wrapS = T.RepeatWrapping; return t;
      })();

      const mPele = mat({ color: '#d8d8dc', map: tPele.map, bumpMap: tPele.bump, bumpScale: .4, roughness: .56, metalness: .08 });
      const mOuro = mat({ color: '#ffffff', map: tOuro, roughness: .3, metalness: 1 });
      const mMort = mat({ color: '#8e8a83', map: tMort, alphaTest: .5, side: T.DoubleSide, roughness: .95 });
      const mBreu = mat({ color: '#000000', roughness: 1, metalness: 0 });
      const mOlho = mat({ color: '#e8eef0', emissive: '#c8d6e0', emissiveIntensity: 1.5, roughness: .3 });

      const corpo = F.G(); g.add(corpo);

      /* ================= massa do corpo (escura, por baixo da mortalha) ================= */
      { const q = new T.SphereGeometry(1, 32, 18); q.scale(.36, .25, 1.1); amassar(q, .04, 5, 3); q.translate(0, .36, -.1);
        const p = q.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), y = p.getY(i); p.setY(i, y + .1 * Math.max(0, 1 - Math.abs(z - .45) / .7)); } q.computeVertexNormals();
        corpo.add(new T.Mesh(guardar(q), mPele)); }

      /* ================= mortalha (malha que ondula como pano sobre o corpo) ================= */
      const NZ = 30, NA = 22, Z0 = -1.3, Z1 = .95;
      const alturaEm = z => .5 + .2 * Math.exp(-((z - .45) ** 2) / .3) + .06 * Math.sin(z * 9) * Math.exp(-((z + .2) ** 2) / .5) - .12 * Math.max(0, (-.6 - z) / .7);
      const meiaLarg = z => .38 + .08 * Math.exp(-((z - .3) ** 2) / .5) - .12 * Math.max(0, (-.7 - z) / .6);
      const qM = new T.PlaneGeometry(1, 1, NA, NZ), pM = qM.attributes.position, base = new Float32Array(pM.count * 3), alt0 = new Float32Array(pM.count);
      for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NA; i++) {
        const n = j * (NA + 1) + i, u = i / NA, z = Z1 - (j / NZ) * (Z1 - Z0);
        const a = (u - .5) * Math.PI * 1.55, h = alturaEm(z), w = meiaLarg(z);
        // em cima segue o corpo; nas laterais cai até perto do chão
        let x = Math.sin(a) * w * 1.18, y = Math.cos(a) * h * .55 + h * .45;
        const caida = Math.max(0, Math.abs(a) - 1.0); x += Math.sign(a) * caida * .1; y -= caida * .4;
        y = Math.max(.22 + .08 * Math.sin(z * 11), y) + ruido(x * 6, z * 5, a, 2) * .05 + .05 * Math.max(0, Math.sin(z * 7 + a * 2)) * Math.max(0, Math.cos(a)); x += ruido(z * 7, a * 3, 1, 4) * .05;
        pM.setXYZ(n, x, y, z); base[n * 3] = x; base[n * 3 + 1] = y; base[n * 3 + 2] = z; alt0[n] = Math.cos(a);
      }
      const uvM = qM.attributes.uv; for (let n = 0; n < uvM.count; n++) { const u = uvM.getX(n), j = Math.floor(n / (NA + 1)); uvM.setXY(n, j / NZ * 2.5 + (u < .5 ? 0 : .37), 1 - Math.abs(u - .5) * 2 * .95); } // barra rasgada nas laterais
      qM.computeVertexNormals();
      const mortalha = new T.Mesh(guardar(qM), mMort); corpo.add(mortalha);

      /* ================= capuz com olhos pálidos ================= */
      const cab = F.G(); cab.position.set(0, .56, .98); corpo.add(cab);
      { const q = new T.SphereGeometry(.3, 22, 16, Math.PI * .18, Math.PI * 1.64, 0, Math.PI * .7); q.rotateY(Math.PI * .5); q.scale(1, 1.05, 1.2); amassar(q, .02, 8, 2);
        const uv = q.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.5, .45 + uv.getY(i) * .55);
        cab.add(new T.Mesh(guardar(q), mMort));
        // tiras do capuz caindo na frente do rosto
        const lista = []; for (let i = 0; i < 9; i++) { const a = -1.1 + i * .275, L = .18 + R() * .25; const pl = new T.PlaneGeometry(.06 + R() * .05, L, 1, 3); pl.translate(0, -L / 2, 0); pl.rotateY(a * .6); pl.translate(Math.sin(a) * .27, .03, Math.cos(a) * .3 + .06); const uv2 = pl.attributes.uv; for (let k = 0; k < uv2.count; k++) uv2.setXY(k, R() * .1 + uv2.getX(k) * .05 + i * .1, .25 + uv2.getY(k) * .5); lista.push(pl); }
        const qT = new T.BufferGeometry(); // junta as tiras (todas do mesmo material)
        { let nv = 0, ni = 0; lista.forEach(q2 => { nv += q2.attributes.position.count; ni += q2.index.count; }); const P = new Float32Array(nv * 3), U = new Float32Array(nv * 2), I = new Uint16Array(ni); let ov = 0, oi = 0; lista.forEach(q2 => { P.set(q2.attributes.position.array, ov * 3); U.set(q2.attributes.uv.array, ov * 2); q2.index.array.forEach((v, k) => { I[oi + k] = v + ov; }); oi += q2.index.count; ov += q2.attributes.position.count; q2.dispose(); }); qT.setAttribute('position', new T.BufferAttribute(P, 3)); qT.setAttribute('uv', new T.BufferAttribute(U, 2)); qT.setIndex(new T.BufferAttribute(I, 1)); qT.computeVertexNormals(); }
        cab.add(new T.Mesh(guardar(qT), mMort));
        // breu dentro do capuz
        const fundo = new T.Mesh(guardar(amassar(new T.SphereGeometry(.24, 16, 12), .02, 9, 1)), mBreu); fundo.scale.set(.95, .9, 1); fundo.position.set(0, -.02, .0); cab.add(fundo);
      }
      const olhos = [-1, 1].map(sx => { const o = new T.Mesh(guardar(new T.SphereGeometry(.03, 10, 8)), mOlho); o.scale.set(1.3, .5, .5); o.position.set(sx * .075, .0, .235); o.rotation.z = sx * -.25; cab.add(o); return o; });
      const [cH, xH] = tela(64, 64); { const gr = xH.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(235,245,255,.95)'); gr.addColorStop(.25, 'rgba(190,210,230,.35)'); gr.addColorStop(1, 'rgba(150,170,200,0)'); xH.fillStyle = gr; xH.fillRect(0, 0, 64, 64); }
      const mHalo = guardar(new T.SpriteMaterial({ map: F.texCanvas(cH), blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
      const halos = olhos.map(o => { const hs = new T.Sprite(mHalo); hs.scale.set(.13, .08, 1); hs.position.copy(o.position).z += .02; cab.add(hs); return hs; });

      /* ================= núcleo roxo no "peito", sob o capuz ================= */
      const nucleo = (() => {
        const ng = F.G(); ng.position.set(0, .3, 1.02); ng.rotation.x = .35; corpo.add(ng);
        const mNuc = mat({ color: '#5a20b0', emissive: '#9a38ff', emissiveIntensity: 2.2, roughness: .15 });
        ng.add(new T.Mesh(guardar(new T.SphereGeometry(.045, 16, 12)), mNuc));
        const pecas = [[new T.TorusGeometry(.06, .011, 6, 22), 0]];
        for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; pecas.push([tubo([V3(Math.cos(a) * .06, Math.sin(a) * .06, 0), V3(Math.cos(a) * .1, Math.sin(a) * .1, .03), V3(Math.cos(a) * .15, Math.sin(a) * .15, -.02)], t => .009 * (1 - t) + .0015, 6, 4), 0]); }
        ng.add(new T.Mesh(juntar(pecas), mat({ color: '#141016', roughness: .3, metalness: .8 })));
        const [c, x] = tela(64, 64), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(210,140,255,.95)'); gr.addColorStop(.3, 'rgba(150,60,255,.4)'); gr.addColorStop(1, 'rgba(90,0,200,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
        const hl = new T.Sprite(guardar(new T.SpriteMaterial({ map: F.texCanvas(c), blending: T.AdditiveBlending, depthWrite: false, transparent: true }))); hl.scale.set(.36, .36, 1); hl.position.z = .03; ng.add(hl);
        return { mNuc, hl };
      })();

      /* ================= braços ================= */
      // segmento do braço (comprimento fixo, ao longo de +y) com pulseiras de ouro
      const segBraco = (L, r0, r1, faixas) => {
        // perfil de braço humano: músculo inchado perto da junta de cima, afinando até o pulso/cotovelo
        const perfil = t => (r0 + (r1 - r0) * t) * (1 + .32 * Math.exp(-((t - .3) ** 2) / .05) - .18 * Math.max(0, t - .75) / .25 + .12 * Math.exp(-((t - .03) ** 2) / .002));
        const q = torno(L, perfil, 8, 12);
        amassar(q, .006, 18, L * 10);
        const lista = [[q, 0]];
        faixas.forEach(([tt, larg]) => { const rr = perfil(tt) + .005; const c2 = new T.CylinderGeometry(rr, rr * 1.02, larg, 12, 1, true); c2.translate(0, tt * L, 0); lista.push([c2, 1]); const t1 = new T.TorusGeometry(rr, .006, 3, 12); t1.rotateX(Math.PI / 2); t1.translate(0, tt * L + larg / 2, 0); const t2 = t1.clone(); t2.translate(0, -larg, 0); lista.push([t1, 1], [t2, 1]); });
        return juntar(lista);
      };
      // mão aberta no chão: dedos compridos, anéis e garras de ponta dourada (dedos para +z, pulso na origem)
      const fazMao = (esc) => {
        const lista = [];
        const palma = new T.SphereGeometry(.045, 10, 8); palma.scale(1.05, .45, 1.25); palma.translate(0, -.02, .06); lista.push([palma, 0]);
        for (let i = 0; i < 5; i++) {
          const pol = i === 4, a = pol ? -1.05 : -.42 + i * .28, L = (pol ? .1 : .16 + (i === 1 || i === 2 ? .03 : 0)) * esc;
          const o = V3(Math.sin(a) * .05, -.02, .06 + Math.cos(a) * .06), dir = V3(Math.sin(a), 0, Math.cos(a));
          const p1 = o.clone().addScaledVector(dir, L * .45).add(V3(0, .03, 0)), p2 = o.clone().addScaledVector(dir, L * .85).add(V3(0, .0, 0)), p3 = o.clone().addScaledVector(dir, L).add(V3(0, -.05, 0));
          lista.push([tubo([o, p1, p2, p3], t => .011 * (1 - t * .45), 7, 4), 0]);
          // garra dourada na ponta
          const gz = new T.ConeGeometry(.011, .06, 6); const q0 = new T.Quaternion().setFromUnitVectors(CIMA, p3.clone().sub(p2).normalize()); gz.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(q0)); gz.translate(p3.x, p3.y - .02, p3.z); lista.push([gz, 1]);
          // anel em alguns dedos
          if (i !== 3) { const an = new T.TorusGeometry(.014, .005, 3, 8); const qa = new T.Quaternion().setFromUnitVectors(V3(0, 0, 1), p1.clone().sub(o).normalize()); an.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(qa)); const pa = o.clone().lerp(p1, .6); an.translate(pa.x, pa.y, pa.z); lista.push([an, 1]); }
        }
        return juntar(lista);
      };
      const qMao = fazMao(.9), qMaoG = fazMao(1.15);
      const qSup = segBraco(.56, .036, .029, [[.82, .04]]), qInf = segBraco(.6, .03, .021, [[.3, .025], [.88, .06]]);
      const qSupL = segBraco(.74, .04, .032, [[.5, .035], [.85, .04]]), qInfL = segBraco(.78, .033, .024, [[.9, .07]]);
      const qCot = guardar(new T.SphereGeometry(.036, 8, 6));
      const bracos = [];
      const novoBraco = (o) => {
        const sup = new T.Mesh(o.longo ? qSupL : qSup, [mPele, mOuro]), inf = new T.Mesh(o.longo ? qInfL : qInf, [mPele, mOuro]), mao = new T.Mesh(o.longo ? qMaoG : qMao, [mPele, mOuro]), cot = new T.Mesh(qCot, mPele);
        if (o.sx < 0) mao.scale.x = -1;
        const mg = F.G(); mg.add(mao); g.add(sup); g.add(inf); g.add(mg); g.add(cot);
        const b = Object.assign({ sup, inf, mg, cot, H: V3(), K: V3(), alvo: o.pe.clone(), a: o.longo ? .78 : .56, b: o.longo ? .8 : .58 }, o);
        bracos.push(b); return b;
      };
      // fileiras dos dois lados, da frente para trás
      const NL = 7;
      for (let k = 0; k < NL; k++) [-1, 1].forEach(sx => {
        const z = .78 - k * .3 + (sx > 0 ? .06 : 0) + (R() - .5) * .08, w = meiaLarg(z), alto = .55 + R() * .3;
        novoBraco({ sx, k, ombro: V3(sx * w * (.55 + R() * .25), alturaEm(z) * alto, z), pe: V3(sx * (.78 + .1 * Math.sin(k * 1.7) + R() * .12), .06, z + .5 - k * .02 + (R() - .5) * .12), polo: V3(sx * (.5 + R() * .5), .9, -.5 - R() * .4), fase: k * .12 + (sx > 0 ? .5 : 0) + (R() - .5) * .05 });
      });
      // braços compridos que saem das costas e passam por cima, puxando o corpo para a frente
      [[-1, .1, .48, 1.62], [1, -.1, .55, 1.55], [-1, -.45, 1.15, .95], [1, -.75, 1.2, .2]].forEach(([sx, z0, xp, zp], k) => {
        novoBraco({ sx, k: -1, longo: true, ombro: V3(sx * .12, alturaEm(z0) * .95, z0), pe: V3(sx * xp, .07, zp), polo: V3(sx * .3, 1, -.4), fase: .25 + k * .37 });
      });

      // duas mãos pequenas saindo de dentro do capuz, agarradas à borda
      const maosCapuz = [-1, 1].map(sx => { const m2 = new T.Mesh(qMao, [mPele, mOuro]); m2.scale.set(sx * .8, .8, .8); m2.position.set(sx * .17, -.17, .2); m2.rotation.set(1.25, sx * -.5, 0, 'YXZ'); cab.add(m2); return m2; });

      /* ================= animação ================= */
      let fase = 0, kAnda = 0;
      const tmp = V3(), alvoH = V3();
      const anim = (dt, t, andando) => {
        kAnda += ((andando ? 1 : 0) - kAnda) * Math.min(1, dt * 3);
        fase += dt * .9 * kAnda;
        // corpo: ondula, respira e se arrasta aos trancos
        const resp = Math.sin(t * 1.4 + Math.sin(t * .5)) * .5 + .5, tranco = Math.pow(Math.max(0, Math.sin(fase * 6.283 * 2)), 3) * kAnda;
        corpo.position.set(Math.sin(fase * 6.283) * .03 * kAnda, -.02 * resp + tranco * .03, tranco * .05);
        corpo.rotation.set(0, Math.sin(fase * 6.283) * .04 * kAnda, Math.sin(fase * 6.283 + 1) * .03 * kAnda + Math.sin(t * .6) * .01);
        corpo.updateMatrix();
        // mortalha: onda correndo da frente para trás por cima dos braços
        const pM2 = mortalha.geometry.attributes.position;
        for (let n = 0; n < pM2.count; n++) { const z = base[n * 3 + 2], cima = Math.max(0, alt0[n]); const onda = Math.sin(z * 5 + fase * 6.283 * 2 + t * .6) * (.025 + .03 * kAnda) * cima + resp * .02 * cima; pM2.setY(n, base[n * 3 + 1] + onda); pM2.setX(n, base[n * 3] * (1 + resp * .02)); }
        pM2.needsUpdate = true; mortalha.geometry.computeVertexNormals();
        // capuz: balança devagar e dá viradas bruscas; olhos piscam
        const vira = tique(t, 5.3, .45, 1.3), vira2 = tique(t, 8.9, .35, 4.2);
        cab.rotation.set(.12 + Math.sin(t * .8) * .05 - vira2 * .2 + tranco * .1, Math.sin(t * .4) * .2 + vira * .7, Math.sin(t * .5) * .08 + vira * .3 - vira2 * .25);
        maosCapuz.forEach((m2, i) => { m2.rotation.x = 1.25 + Math.sin(t * 2.3 + i * 2) * .06 + tique(t, 3.9, .3, i * 1.7) * .35; });
        const pisca = tique(t, 4.1, .14) > .4 ? .1 : 1; olhos.forEach((o, i) => { o.scale.y = .6 * pisca; halos[i].material.opacity = pisca; });
        // braços: onda metacrônica (como uma centopeia), cada mão desliza para trás e é levada à frente pelo alto
        bracos.forEach((b, i) => {
          const c = ((fase * (b.longo ? 1 : 2) - b.fase) % 1 + 1) % 1, duty = b.longo ? .7 : .62;
          let dz = 0, dy = 0;
          const passo = b.longo ? .55 : .32;
          if (c < duty) dz = passo * (.5 - c / duty);
          else { const u = (c - duty) / (1 - duty), e = u * u * (3 - 2 * u); dz = passo * (-.5 + e); dy = Math.sin(u * Math.PI) * (b.longo ? .45 : .22); }
          dz *= kAnda; dy *= kAnda;
          // parado: dedos tamborilam e um braço ou outro muda de apoio
          const ajeita = tique(t, 4.6 + i * .37, .5, i * 1.9) * (1 - kAnda);
          b.alvo.set(b.pe.x, b.pe.y + dy + ajeita * .12, b.pe.z + dz + ajeita * .05);
          b.H.copy(b.ombro).applyMatrix4(corpo.matrix);
          ik(b.H, b.alvo, b.a, b.b, b.polo, b.K);
          b.sup.position.copy(b.H); b.sup.quaternion.setFromUnitVectors(CIMA, tmp.subVectors(b.K, b.H).normalize());
          b.inf.position.copy(b.K); b.inf.quaternion.setFromUnitVectors(CIMA, tmp.subVectors(b.alvo, b.K).normalize());
          b.cot.position.copy(b.K);
          const fim = alvoH.copy(b.K).addScaledVector(tmp, b.b);
          b.mg.position.copy(fim);
          // a mão aponta para fora e para a frente; no ar, os dedos caem
          const yaw = Math.atan2(fim.x - b.H.x * .5, (fim.z - b.H.z) + .35);
          b.mg.rotation.set(dy * 2.2 + Math.sin(t * 6 + i) * .04 * (1 - kAnda) + ajeita * .6, yaw, 0, 'YXZ');
        });
        const pu = Math.pow(.5 + .5 * Math.sin(t * 1.3), 3);
        nucleo.mNuc.emissiveIntensity = 1.4 + pu * 2.4; nucleo.hl.material.opacity = .45 + pu * .55;
      };
      anim(0, 0, false);
      return { g, alt: 1.0, raioBase: .9, anim };
    },
  };
})();

/* ===== forma: enraizado ===== */
/* enraizado.js · forma de Filho: homem cadavérico de chapéu de palha e boca escancarada, avental
   verde rasgado com ferramentas no bolso, galhos com folhas saindo dos ombros e dos braços, a parte de
   baixo do corpo desfeita em raízes espalhadas pelo chão (com um crânio e costelas entre elas), uma
   tesoura de poda enferrujada numa mão e garras longas na outra. Fica plantado no lugar: as raízes seguram o corpo.
   Formato: ACF3D.formasFilho.enraizado = { nome, criar(F, s) → { g, alt, raioBase, anim } } */
(() => {
  'use strict';
  const NS = window.ACF3D = window.ACF3D || {};
  /* ---------- kit de modelagem (o mesmo nas formas detalhadas) ---------- */
  function kit(F) {
    const T = F.T, U = T.BufferGeometryUtils, V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
    const vv = p => (p && p.isVector3 ? p : V(p[0], p[1], p[2]));
    // material: as cores são escritas como aparecem na tela (vão para o espaço linear aqui)
    const mat = (p = {}, fisico) => {
      const q = { ...p };
      ['color', 'emissive'].forEach(k => { if (typeof q[k] === 'string') q[k] = new T.Color(q[k]).convertSRGBToLinear(); });
      if (q.duplo) { q.side = T.DoubleSide; delete q.duplo; }
      return F.guardar(fisico ? new T.MeshPhysicalMaterial(q) : new T.MeshStandardMaterial(q));
    };
    const tela = (w, h) => NS.tela(w, h || w);
    const tex = (c, rep) => F.texCanvas(c, rep);
    const malha = (pai, geo, m) => { const me = new T.Mesh(F.guardar(geo), m); pai.add(me); return me; };
    const grupo = (pai, x = 0, y = 0, z = 0) => { const g = new T.Group(); g.position.set(x, y, z); if (pai) pai.add(g); return g; };
    // ruído suave (valor) e fractal, para deformar vértices e pintar texturas
    const fr = v => v - Math.floor(v), h3 = (i, j, k) => fr(Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453);
    const sm = t => t * t * (3 - 2 * t), L = (a, b, t) => a + (b - a) * t;
    function vn(x, y, z) {
      const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), u = sm(x - i), v = sm(y - j), w = sm(z - k);
      const a = L(L(h3(i, j, k), h3(i + 1, j, k), u), L(h3(i, j + 1, k), h3(i + 1, j + 1, k), u), v);
      const b = L(L(h3(i, j, k + 1), h3(i + 1, j, k + 1), u), L(h3(i, j + 1, k + 1), h3(i + 1, j + 1, k + 1), u), v);
      return L(a, b, w) * 2 - 1;
    }
    const fbm = (x, y, z, o = 3) => { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * vn(x * f, y * f, z * f); a *= .5; f *= 2.03; } return s; };
    function deform(geo, fn) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const r = fn(p.getX(i), p.getY(i), p.getZ(i), i); if (r) p.setXYZ(i, r[0], r[1], r[2]); }
      p.needsUpdate = true; geo.computeVertexNormals(); return geo;
    }
    /* casca: superfície de revolução de seção elíptica, anel por anel (de baixo para cima).
       perfil: [[y, largura, profundidade, deslocZ, deslocX]]. A frente (+z) fica em u = 0,5 da textura. */
    function casca(perfil, o = {}) {
      const seg = o.seg || 24, n = perfil.length, pos = [], uv = [], idx = [];
      const ab = o.abertura || 0, ps0 = o.arco ? o.arco[0] : ab ? ab / 2 : Math.PI, pl0 = o.arco ? o.arco[1] : ab ? Math.PI * 2 - ab : Math.PI * 2;
      for (let i = 0; i <= seg; i++) {
        const u = i / seg;
        for (let j = 0; j < n; j++) {
          const p = perfil[j], [ps, pl] = o.arcoY ? o.arcoY(p[0], j) : [ps0, pl0], ph = ps + u * pl;
          let sx = Math.sin(ph), sz = Math.cos(ph);
          if (o.quadrado) { sx = Math.sign(sx) * Math.pow(Math.abs(sx), o.quadrado); sz = Math.sign(sz) * Math.pow(Math.abs(sz), o.quadrado); }
          let x = sx * p[1] + (p[4] || 0), y = p[0], z = sz * p[2] + (p[3] || 0);
          if (o.deform) { const r = o.deform(x, y, z, j, u, Math.atan2(Math.sin(ph), Math.cos(ph))); if (r) [x, y, z] = r; }
          pos.push(x, y, z); uv.push(u, j / (n - 1));
        }
      }
      for (let i = 0; i < seg; i++) for (let j = 0; j < n - 1; j++) { const a = i * n + j, b = (i + 1) * n + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx); geo.computeVertexNormals(); return geo;
    }
    // tubo que afina ao longo de uma curva: raio(t), t de 0 a 1 (u da textura corre ao longo do tubo)
    function tubo(pts, raio, o = {}) {
      const curva = new T.CatmullRomCurve3(pts.map(vv), false, 'catmullrom', o.tensao ?? .5);
      const nS = o.seg || 16, nR = o.rad || 6, geo = new T.TubeGeometry(curva, nS, 1, nR, false);
      const pos = geo.attributes.position, P = V();
      for (let i = 0; i <= nS; i++) {
        curva.getPointAt(i / nS, P); const rr = typeof raio === 'number' ? raio : raio(i / nS);
        for (let j = 0; j <= nR; j++) { const k = i * (nR + 1) + j; pos.setXYZ(k, P.x + (pos.getX(k) - P.x) * rr, P.y + (pos.getY(k) - P.y) * rr, P.z + (pos.getZ(k) - P.z) * rr); }
      }
      geo.computeVertexNormals(); return geo;
    }
    // cápsula pendurada: pivô no topo (y = 0), desce até -comp
    function capsula(r1, r2, comp, seg = 8, anel = 3) {
      const pf = [];
      for (let a = 0; a <= anel; a++) { const t = a / anel * Math.PI / 2; pf.push(new T.Vector2(Math.max(1e-4, r2 * Math.sin(t)), -comp - r2 * Math.cos(t))); }
      for (let a = 1; a <= anel; a++) { const t = Math.PI / 2 + a / anel * Math.PI / 2; pf.push(new T.Vector2(Math.max(1e-4, r1 * Math.sin(t)), -r1 * Math.cos(t))); }
      return new T.LatheGeometry(pf, seg);
    }
    // fita (tira de pano) ao longo de uma curva; a face olha para fora do eixo y (ou para normal(P, t))
    function fita(pts, larg, o = {}) {
      const curva = new T.CatmullRomCurve3(pts.map(vv), false, 'catmullrom', .5), n = o.seg || 24, pos = [], uv = [], idx = [];
      const P = V(), Tn = V(), N = V(), B = V();
      for (let i = 0; i <= n; i++) {
        const t = i / n; curva.getPointAt(t, P); curva.getTangentAt(t, Tn);
        if (o.normal) N.copy(o.normal(P, t)); else N.set(P.x, 0, P.z);
        if (N.lengthSq() < 1e-8) N.set(0, 0, 1); N.normalize();
        B.copy(Tn).cross(N).normalize(); const w = (typeof larg === 'number' ? larg : larg(t)) / 2;
        const tor = o.torcao ? o.torcao(t) : 0;
        for (const s of [-1, 1]) { const q = P.clone().addScaledVector(B, s * w).addScaledVector(N, tor * s * w); pos.push(q.x, q.y, q.z); uv.push(s < 0 ? 0 : 1, t * (o.rep || 1)); }
      }
      for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx); geo.computeVertexNormals(); return geo;
    }
    // junta várias malhas fixas num só desenho por material (menos chamadas de desenho)
    function assar(raiz) {
      if (!U || !U.mergeBufferGeometries) return raiz;
      raiz.updateMatrixWorld(true);
      const inv = raiz.matrixWorld.clone().invert(), grupos = new Map();
      raiz.traverse(o => {
        if (!o.isMesh || o.isInstancedMesh) return;
        let g = o.geometry.clone();
        if (!g.index) { const ix = []; for (let i = 0; i < g.attributes.position.count; i++) ix.push(i); g.setIndex(ix); }
        Object.keys(g.attributes).forEach(k => { if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); });
        if (!g.attributes.uv) g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        if (!g.attributes.normal) g.computeVertexNormals();
        g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, o.matrixWorld));
        if (!grupos.has(o.material)) grupos.set(o.material, []);
        grupos.get(o.material).push(g); o.geometry.dispose();
      });
      const out = new T.Group(); out.position.copy(raiz.position); out.quaternion.copy(raiz.quaternion); out.scale.copy(raiz.scale);
      grupos.forEach((lista, m) => { const geo = U.mergeBufferGeometries(lista); lista.forEach(g => g.dispose()); if (geo) malha(out, geo, m); });
      if (raiz.parent) { raiz.parent.add(out); raiz.parent.remove(raiz); }
      return out;
    }
    // gira obj para que o eixo +y local aponte para eixoY e o +z fique o mais perto possível de eixoZ
    function orientar(obj, eixoY, eixoZ) {
      const y = vv(eixoY).clone().normalize(), z = vv(eixoZ).clone(); z.sub(y.clone().multiplyScalar(z.dot(y))).normalize();
      const x = y.clone().cross(z); obj.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z));
    }
    // orienta obj com eixos dados no espaço de ref (ref pode ser o grupo do modelo)
    function alinharEm(obj, ref, eixoY, eixoZ) {
      const tmp = new T.Object3D(); orientar(tmp, eixoY, eixoZ);
      ref.updateWorldMatrix(true, true); const qr = ref.getWorldQuaternion(new T.Quaternion()), qp = obj.parent.getWorldQuaternion(new T.Quaternion());
      obj.quaternion.copy(qp.invert().multiply(qr).multiply(tmp.quaternion));
    }
    // posição de obj no espaço de ref
    const posEm = (obj, ref, out = V()) => { ref.updateWorldMatrix(true, false); obj.getWorldPosition(out); return ref.worldToLocal(out); };
    // membro de dois ossos (braço ou perna) pendurado em -y, com juntas animáveis
    function membro(pai, L1, L2, r0, r1, r2, m, o = {}) {
      const ombro = grupo(pai), braco = grupo(ombro), cot = grupo(braco, 0, -L1, 0), punho = grupo(cot, 0, -L2, 0);
      const g1 = capsula(r0, r1, L1, o.seg || 8, 3), g2 = capsula(r1 * .95, r2, L2, o.seg || 8, 3);
      if (o.ossudo) [g1, g2].forEach((g, k) => deform(g, (x, y, z) => { const t = Math.min(1, Math.max(0, -y / (k ? L2 : L1))); const b = 1 + o.ossudo * (Math.exp(-Math.pow((t - (k ? .02 : .97)) / .08, 2)) * 1.4 - .25 * Math.sin(t * Math.PI)) + fbm(x * 30, y * 30, z * 30, 2) * .08; return [x * b, y, z * b]; }));
      const m1 = malha(braco, g1, m), m2 = malha(cot, g2, m);
      return { ombro, braco, cot, punho, Lb: L1, La: L2, m1, m2 };
    }
    // IK de dois ossos: põe a mão em alvo, com o cotovelo apontando para polo (no espaço do pai do ombro)
    function ik(br, alvo, polo) {
      const P = br.ombro.position.clone(), Tg = vv(alvo).clone(), u = Tg.clone().sub(P); let d = u.length(); u.normalize();
      const L1 = br.Lb, L2 = br.La; d = Math.max(Math.abs(L1 - L2) + 1e-3, Math.min(d, (L1 + L2) * .999));
      const ang = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
      const pv = vv(polo).clone(); pv.sub(u.clone().multiplyScalar(pv.dot(u))).normalize();
      const d1 = u.clone().multiplyScalar(Math.cos(ang)).add(pv.multiplyScalar(Math.sin(ang))).normalize();
      const cot = P.clone().add(d1.clone().multiplyScalar(L1)), d2 = Tg.clone().sub(cot).normalize(), BX = V(0, -1, 0);
      br.ombro.rotation.set(0, 0, 0); br.braco.quaternion.setFromUnitVectors(BX, d1);
      br.cot.quaternion.setFromUnitVectors(BX, d2.applyQuaternion(br.braco.quaternion.clone().invert()));
    }
    /* mão: punho na origem, dedos para -y, palma para +z. lado = -1 mão direita (polegar em -x), +1 esquerda.
       o: { palma, larg, esp, dedo (fator), raio, garra (comprimento), matGarra, abrir } */
    function mao(pai, m, o = {}) {
      const g = grupo(pai), Lp = o.palma || .085, w = o.larg || .07, esp = o.esp || .024, df = o.dedo || 1, rd = o.raio || .0095, lado = o.lado || 1;
      const palma = malha(g, deform(new T.SphereGeometry(1, 10, 8), (x, y, z) => [x * w * .5 * (1 - .12 * y), y * Lp * .5 - Lp * .5, z * esp * .5 * (1 + .3 * y) - (z > 0 ? .002 : 0)]), m);
      const dedos = [], comp = [.92, 1.04, .98, .78], xs = [.36, .12, -.12, -.36], cache = new Map();
      const cap = (r1, r2, l) => { const k = [r1, r2, l].map(v => v.toFixed(4)).join(); if (!cache.has(k)) cache.set(k, capsula(r1, r2, l, 6, 2)); return cache.get(k).clone(); };
      const falange = (pai2, ls, rr, garra) => {
        const segs = []; let p = pai2;
        ls.forEach((l, i) => { const s = grupo(p, 0, i ? -ls[i - 1] : 0, 0); malha(s, cap(rr[i], rr[i + 1], l), m); segs.push(s); p = s; });
        if (garra) { const ponta = malha(p, tubo([[0, -ls[ls.length - 1] + .004, 0], [0, -ls[ls.length - 1] - garra * .55, garra * .12], [0, -ls[ls.length - 1] - garra, garra * .45]], t => rr[rr.length - 1] * 1.1 * (1 - t * .92), { seg: 6, rad: 5 }), o.matGarra || m); ponta.userData.garra = true; }
        return segs;
      };
      for (let f = 0; f < 4; f++) {
        const tot = .085 * df * comp[f], base = grupo(g, xs[f] * w * lado, -Lp * .92 + Math.abs(xs[f]) * Lp * .25, 0);
        base.rotation.z = -xs[f] * lado * (o.abrir ?? .15);
        dedos.push(falange(base, [tot * .43, tot * .32, tot * .25], [rd, rd * .92, rd * .82, rd * .66], o.garra));
      }
      const pol = grupo(g, lado * w * .4, -Lp * .28, esp * .3), dp = 1 + (df - 1) * .45; pol.rotation.set(-.55, -lado * .5, lado * .42);
      dedos.push(falange(pol, [.03 * dp, .026 * dp, .02 * dp], [rd * 1.2, rd * 1.08, rd * .95, rd * .75], o.garra ? o.garra * .7 : 0));
      cache.forEach(c => c.dispose());
      // dobra os dedos: k (0 a 1) por dedo ou um só número; tremor soma um pouco de vida
      const curvar = (k, tremor = 0, t = 0) => dedos.forEach((d, i) => {
        const kk = (Array.isArray(k) ? k[i] : k) + (tremor ? tremor * Math.sin(t * (7 + i * 1.7) + i * 2.1) : 0);
        d.forEach((s, j) => { s.rotation.x = -kk * (i === 4 ? [.25, .5, .4][j] : [.75, 1.05, .8][j]); });
      });
      return { g, dedos, curvar, palma };
    }
    // brilho em volta (sprite somado à luz)
    let texBrilho = null;
    function halo(pai, cor, tam, x = 0, y = 0, z = 0) {
      if (!texBrilho) { const [c, x2] = tela(128); const gr = x2.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x2.fillStyle = gr; x2.fillRect(0, 0, 128, 128); texBrilho = tex(c); }
      const sm2 = F.guardar(new T.SpriteMaterial({ map: texBrilho, color: new T.Color(cor), transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      const sp = new T.Sprite(sm2); sp.scale.set(tam, tam, 1); sp.position.set(x, y, z); pai.add(sp); return sp;
    }
    /* núcleo roxo: esfera brilhante numa moldura escura de espinhos, como patas de aranha (olha para +z) */
    function nucleo(pai, r = .06, o = {}) {
      const g = grupo(pai), luzM = mat({ color: '#2a0640', emissive: '#6a1eff', emissiveIntensity: 1.6, roughness: .15, metalness: .1 });
      const miolo = mat({ color: '#000000', emissive: '#d2b0ff', emissiveIntensity: 1.3 });
      const esf = malha(g, new T.SphereGeometry(r, 20, 14), luzM); esf.scale.z = .8;
      malha(g, new T.SphereGeometry(r * .3, 10, 8), miolo).position.z = r * .66;
      const escuro = mat({ color: '#140c12', roughness: .35, metalness: .55 });
      const mold = grupo(g);
      malha(mold, new T.TorusGeometry(r * 1.12, r * .2, 6, 24), escuro);
      const n = o.pernas || 8;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + .2, c = Math.cos(a), s = Math.sin(a), k = 1 + (i % 2) * .35;
        malha(mold, tubo([[c * r * 1.1, s * r * 1.1, r * .1], [c * r * 1.9 * k, s * r * 1.9 * k, r * .55], [c * r * 2.7 * k, s * r * 2.7 * k, r * .2], [c * r * 3.3 * k, s * r * 3.3 * k - r * .3, -r * .35]], t => r * .16 * (1 - t * .85), { seg: 10, rad: 5 }), escuro);
        const b = .5 + a; malha(mold, new T.ConeGeometry(r * .12, r * .9, 5), escuro).position.set(Math.cos(b) * r * 1.35, Math.sin(b) * r * 1.35, r * .1);
        mold.children[mold.children.length - 1].rotation.z = b - Math.PI / 2;
      }
      const moldA = assar(mold);
      const h = halo(g, o.cor || '#6a22d8', r * (o.halo || 9), 0, 0, r * .9);
      const pulso = t => {
        const ph = (t * .72) % 1, k = Math.exp(-Math.pow((ph - .1) / .05, 2)) + .6 * Math.exp(-Math.pow((ph - .3) / .06, 2));
        luzM.emissiveIntensity = 1.1 + k * 1.5 + Math.sin(t * .5) * .2; h.material.opacity = .35 + k * .4; esf.scale.set(1 + k * .07, 1 + k * .07, .8 + k * .06);
      };
      return { g, pulso, moldura: moldA };
    }
    // utilidades de pintura
    const pinta = {
      grao(x, w, h, n, a, tam = 2, cores) { for (let i = 0; i < n; i++) { x.fillStyle = cores ? cores[(Math.random() * cores.length) | 0] : `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},${a * Math.random()})`; x.globalAlpha = cores ? a * Math.random() : 1; x.fillRect(Math.random() * w, Math.random() * h, tam, tam); } x.globalAlpha = 1; },
      mancha(x, cx, cy, r, cor, a = 1, pontas = 9) { x.save(); x.globalAlpha = a; x.fillStyle = cor; x.beginPath(); for (let i = 0; i <= pontas * 2; i++) { const an = i / (pontas * 2) * Math.PI * 2, rr = r * (.55 + Math.random() * .6); x.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); } x.fill(); x.restore(); },
      escorrido(x, cx, cy, comp, larg, cor, a = 1) { x.save(); x.globalAlpha = a; x.strokeStyle = cor; x.lineCap = 'round'; let px = cx, py = cy; x.lineWidth = larg; x.beginPath(); x.moveTo(px, py); const n = 12; for (let i = 0; i < n; i++) { px += (Math.random() - .5) * larg * .8; py += comp / n; x.lineWidth = larg * (1 - i / n * .6); x.lineTo(px, py); } x.stroke(); x.beginPath(); x.fillStyle = cor; x.arc(px, py, larg * .7, 0, 7); x.fill(); x.restore(); },
      veia(x, x0, y0, ang, comp, larg, cor, a = .5, ramos = 2) { x.save(); x.strokeStyle = cor; x.globalAlpha = a; x.lineCap = 'round'; const rec = (px, py, an, c, l, d) => { x.lineWidth = l; x.beginPath(); x.moveTo(px, py); let qx = px, qy = py; const n = 8; for (let i = 0; i < n; i++) { an += (Math.random() - .5) * .5; qx += Math.cos(an) * c / n; qy += Math.sin(an) * c / n; x.lineTo(qx, qy); if (d > 0 && Math.random() < .18) rec(qx, qy, an + (Math.random() < .5 ? -.7 : .7), c * .5, l * .6, d - 1); } x.stroke(); }; rec(x0, y0, ang, comp, larg, ramos); x.restore(); },
    };
    return { T, V, vv, mat, tela, tex, malha, grupo, fbm, vn, deform, casca, tubo, capsula, fita, assar, orientar, alinharEm, posEm, membro, ik, mao, halo, nucleo, pinta };
  }
  (NS.formasFilho = NS.formasFilho || {}).enraizado = {
    nome: 'Homem de raízes (chapéu de palha)',
    criar: (F, s) => {
      const K = kit(F), { T, V, mat, tela, tex, malha, grupo, fbm, deform, casca, tubo, fita, assar, orientar, membro, ik, mao, nucleo, pinta, alinharEm, posEm } = K;
      const R = NS.rng(808), g = grupo(null), PI = Math.PI, U2 = T.BufferGeometryUtils;
      const junta = (pai, lista, m) => { if (!lista.length) return null; const gg = U2 && U2.mergeBufferGeometries(lista); if (gg) { lista.forEach(q => q.dispose()); return malha(pai, gg, m); } lista.forEach(q => malha(pai, q, m)); return null; };

      /* ---------- texturas ---------- */
      // casca de raiz: fissuras correndo ao longo (eixo x da tela = comprimento do tubo)
      const [cr, xr] = tela(256, 256); xr.fillStyle = '#4a3726'; xr.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 90; i++) { const y0 = R() * 256; xr.strokeStyle = R() < .6 ? `rgba(18,10,6,${.3 + R() * .4})` : `rgba(140,110,80,${.15 + R() * .2})`; xr.lineWidth = 1 + R() * 3; xr.beginPath(); xr.moveTo(R() * 256 - 40, y0); xr.bezierCurveTo(R() * 256, y0 + (R() - .5) * 12, R() * 256, y0 + (R() - .5) * 12, R() * 256 + 60, y0 + (R() - .5) * 10); xr.stroke(); }
      for (let i = 0; i < 24; i++) { pinta.mancha(xr, R() * 256, R() * 256, 3 + R() * 7, '#1a0e08', .7, 6); }
      for (let i = 0; i < 30; i++) pinta.mancha(xr, R() * 256, R() * 256, 6 + R() * 20, R() < .5 ? '#3a4a22' : '#5a2a1a', .15);
      pinta.grao(xr, 256, 256, 3000, .12, 2);
      const texR = tex(xr.canvas, [5, 1]);
      const matRaiz = mat({ map: texR, bumpMap: texR, bumpScale: .012, roughness: .92 });
      const texR2 = tex(xr.canvas, [2, 1]);
      const matGalho = mat({ map: texR2, bumpMap: texR2, bumpScale: .008, roughness: .9 });
      // pele seca de cadáver: cinza amarronzada, manchas de podridão, veias escuras
      const [cp, xp] = tela(256, 256); xp.fillStyle = '#6a5a48'; xp.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 60; i++) pinta.mancha(xp, R() * 256, R() * 256, 5 + R() * 24, R() < .4 ? '#4e3a2a' : R() < .5 ? '#5e5a3a' : '#9a8a70', .3);
      for (let i = 0; i < 20; i++) pinta.veia(xp, R() * 256, R() * 256, R() * 6.3, 30 + R() * 50, 1, '#3a2418', .5, 2);
      for (let i = 0; i < 50; i++) { const y0 = R() * 256; xp.strokeStyle = 'rgba(40,26,16,.3)'; xp.lineWidth = 1; xp.beginPath(); xp.moveTo(R() * 256, y0); xp.lineTo(R() * 256, y0 + (R() - .5) * 8); xp.stroke(); }
      pinta.grao(xp, 256, 256, 3000, .1, 1);
      const texP = tex(cp, [2, 1]);
      const matPele = mat({ map: texP, bumpMap: texP, bumpScale: .01, roughness: .78, color: '#cbbaa6' });
      const matUnha = mat({ color: '#2a2018', roughness: .4, metalness: .1 });
      // tronco: camisa velha em cima (rasgada no peito, costelas à mostra, veias roxas em volta do núcleo), casca embaixo
      const H0 = .35, H1 = 1.84;
      const [ct, xt] = tela(512, 512);
      let gr = xt.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#6c6450'); gr.addColorStop(.45, '#5c5640'); gr.addColorStop(.62, '#4c3c2a'); gr.addColorStop(1, '#3e2c1e'); xt.fillStyle = gr; xt.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 80; i++) pinta.mancha(xt, R() * 512, R() * 300, 8 + R() * 30, R() < .5 ? '#3a3424' : '#7a6e54', .2);
      // peito aberto: pele e costelas
      xt.fillStyle = '#6e5a46'; pinta.mancha(xt, 256, 150, 70, '#6a5644', 1, 14);
      for (let i = 0; i < 6; i++) { xt.strokeStyle = 'rgba(30,18,10,.8)'; xt.lineWidth = 6; xt.beginPath(); xt.moveTo(200, 95 + i * 22); xt.quadraticCurveTo(256, 112 + i * 22, 312, 95 + i * 22); xt.stroke(); xt.strokeStyle = 'rgba(190,170,140,.6)'; xt.lineWidth = 3; xt.beginPath(); xt.moveTo(204, 91 + i * 22); xt.quadraticCurveTo(256, 108 + i * 22, 308, 91 + i * 22); xt.stroke(); }
      for (let i = 0; i < 26; i++) pinta.veia(xt, 256, 118, R() * PI * 2, 40 + R() * 70, 2.5, '#7a2ac8', .8, 2);
      // casca subindo pelo baixo
      for (let i = 0; i < 140; i++) { const x0 = R() * 512, y0 = 300 + R() * 212; xt.strokeStyle = `rgba(16,8,4,${.3 + R() * .4})`; xt.lineWidth = 1 + R() * 4; xt.beginPath(); xt.moveTo(x0, y0); xt.bezierCurveTo(x0 + (R() - .5) * 20, y0 - 30, x0 + (R() - .5) * 20, y0 - 60, x0 + (R() - .5) * 30, y0 - 40 - R() * 120); xt.stroke(); }
      pinta.grao(xt, 512, 512, 7000, .1, 2);
      const texT = tex(ct);
      const matTronco = mat({ map: texT, bumpMap: texT, bumpScale: .01, roughness: .85 });
      // avental: lona verde suja, furos, barra em farrapos (a barra fica embaixo da tela)
      const [ca, xa] = tela(512, 512);
      gr = xa.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#4a5030'); gr.addColorStop(.6, '#3c4228'); gr.addColorStop(1, '#2e2c1c'); xa.fillStyle = gr; xa.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 400; i++) { const y0 = R() * 512; xa.strokeStyle = `rgba(20,24,10,${.05 + R() * .1})`; xa.lineWidth = 1; xa.beginPath(); xa.moveTo(0, y0); xa.lineTo(512, y0 + (R() - .5) * 4); xa.stroke(); }
      for (let i = 0; i < 70; i++) pinta.mancha(xa, R() * 512, R() * 512, 6 + R() * 30, R() < .4 ? '#4a1a10' : R() < .5 ? '#2a2414' : '#6a6a40', .25 + R() * .25);
      for (let i = 0; i < 10; i++) pinta.escorrido(xa, R() * 512, 100 + R() * 250, 80 + R() * 160, 3 + R() * 4, '#4a140c', .5);
      pinta.grao(xa, 512, 512, 6000, .1, 2);
      xa.globalCompositeOperation = 'destination-out';
      for (let x0 = -10; x0 < 520;) { const w = 8 + R() * 26, l = 60 + R() * 230; xa.beginPath(); xa.moveTo(x0, 513); xa.lineTo(x0 + w * (.3 + R() * .4), 512 - l); xa.lineTo(x0 + w, 513); xa.fill(); x0 += w + R() * 6; }
      for (let i = 0; i < 50; i++) { const y = 160 + Math.pow(R(), .6) * 300; pinta.mancha(xa, R() * 512, y, 5 + R() * 22, '#000', 1, 7); }
      xa.globalCompositeOperation = 'source-over';
      const matAvental = mat({ map: tex(ca), roughness: .9, alphaTest: .5, duplo: true });
      // palha do chapéu: trama, furos e aba desfiada (a aba fica no topo da tela)
      const [cc, xc] = tela(512, 256); xc.fillStyle = '#9a8250'; xc.fillRect(0, 0, 512, 256);
      for (let y0 = 0; y0 < 256; y0 += 6) { xc.strokeStyle = `rgba(60,44,20,${.4 + R() * .3})`; xc.lineWidth = 1.5; xc.beginPath(); xc.moveTo(0, y0); xc.lineTo(512, y0 + (R() - .5) * 2); xc.stroke(); }
      for (let i = 0; i < 900; i++) { const x0 = R() * 512, y0 = R() * 256; xc.strokeStyle = R() < .5 ? 'rgba(200,170,110,.5)' : 'rgba(50,36,16,.5)'; xc.lineWidth = 1; xc.beginPath(); xc.moveTo(x0, y0); xc.lineTo(x0 + 6 + R() * 10, y0 + (R() - .5) * 2); xc.stroke(); }
      for (let i = 0; i < 40; i++) pinta.mancha(xc, R() * 512, R() * 256, 8 + R() * 22, R() < .5 ? '#4a3a1e' : '#3a2e18', .3);
      xc.globalCompositeOperation = 'destination-out';
      for (let x0 = 0; x0 < 512;) { const w = 3 + R() * 10, l = 4 + R() * 30; xc.beginPath(); xc.moveTo(x0, -1); xc.lineTo(x0 + w / 2, l); xc.lineTo(x0 + w, -1); xc.fill(); x0 += w + R() * 4; }
      for (let i = 0; i < 14; i++) pinta.mancha(xc, R() * 512, 20 + R() * 120, 4 + R() * 12, '#000', 1, 6);
      xc.globalCompositeOperation = 'source-over';
      const matPalha = mat({ map: tex(xc.canvas), roughness: .95, alphaTest: .5, duplo: true });
      // osso velho
      const matOsso = mat({ color: '#8e8264', roughness: .75 });
      // ferrugem
      const [cf, xf] = tela(128, 128); xf.fillStyle = '#5a3a24'; xf.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 50; i++) pinta.mancha(xf, R() * 128, R() * 128, 3 + R() * 14, R() < .4 ? '#8a4a1e' : R() < .5 ? '#3a2a20' : '#6a6460', .5);
      for (let i = 0; i < 6; i++) pinta.mancha(xf, R() * 128, R() * 128, 4 + R() * 8, '#4a0c08', .7);
      pinta.grao(xf, 128, 128, 1500, .2, 1);
      const texF = tex(cf, [6, 6]);
      const matFerro = mat({ map: texF, bumpMap: texF, bumpScale: .004, roughness: .72, metalness: .55 });
      const matMadeira = mat({ color: '#4a3220', roughness: .8 });
      // folhas: atlas 2 x 2 com quatro folhas diferentes
      const [cl, xl] = tela(128, 128); xl.clearRect(0, 0, 128, 128);
      [['#5e5e24', '#3a3a14'], ['#7a6a2a', '#4a3a14'], ['#4a5228', '#2a3010'], ['#6a4a22', '#3a2410']].forEach(([c1, c2], i) => {
        const ox = (i % 2) * 64 + 32, oy = Math.floor(i / 2) * 64 + 32;
        xl.fillStyle = c1; xl.beginPath(); xl.moveTo(ox, oy - 29); xl.quadraticCurveTo(ox + 20, oy - 6, ox, oy + 29); xl.quadraticCurveTo(ox - 20, oy - 6, ox, oy - 29); xl.fill();
        xl.strokeStyle = c2; xl.lineWidth = 1.5; xl.beginPath(); xl.moveTo(ox, oy - 27); xl.lineTo(ox, oy + 29); for (let k = -2; k <= 2; k++) { xl.moveTo(ox, oy + k * 9); xl.lineTo(ox + 10, oy + k * 9 - 6); xl.moveTo(ox, oy + k * 9); xl.lineTo(ox - 10, oy + k * 9 - 6); } xl.stroke();
        for (let k = 0; k < 6; k++) pinta.mancha(xl, ox + (R() - .5) * 16, oy + (R() - .5) * 40, 2 + R() * 3, '#2a1a0a', .6);
      });
      const matFolha = mat({ map: tex(cl), alphaTest: .5, duplo: true, roughness: .8 });

      /* ---------- raízes espalhadas pelo chão (o corpo fica plantado no lugar) ---------- */
      const raizG = grupo(g), listaR = [], listaR2 = [];
      const NR = 15;
      for (let i = 0; i < NR; i++) {
        const a = i / NR * PI * 2 + (R() - .5) * .3, c = Math.cos(a), s2 = Math.sin(a), L = .85 + R() * .6, pts = [];
        const n = 9;
        for (let k = 0; k <= n; k++) {
          const u = k / n, r = .08 + u * L, y = k < 3 ? .62 - k * .22 : .03 + Math.max(0, Math.sin(u * 9 + i)) * .045 + (k === n ? -.02 : 0);
          const w = (R() - .5) * .12 * u;
          pts.push(V(c * r - s2 * w, Math.max(.015, y), s2 * r + c * w));
        }
        const r0 = .06 + R() * .025;
        listaR.push(tubo(pts, t => r0 * Math.pow(1 - t, 1.3) + .006, { seg: 30, rad: 7 }));
        // ramificações secundárias
        for (let k = 0; k < 2; k++) {
          const u0 = .4 + R() * .45, b = new T.CatmullRomCurve3(pts).getPointAt(u0), ab = a + (R() < .5 ? -1 : 1) * (.5 + R() * .5), L2 = .25 + R() * .35, q = [];
          for (let j = 0; j <= 4; j++) { const v2 = j / 4; q.push(V(b.x + Math.cos(ab) * L2 * v2 + (R() - .5) * .04, .02 + Math.max(0, Math.sin(v2 * 6 + k)) * .02, b.z + Math.sin(ab) * L2 * v2 + (R() - .5) * .04)); }
          listaR2.push(tubo(q, t => .022 * (1 - t) * Math.pow(1 - u0, .5) + .004, { seg: 12, rad: 5 }));
        }
      }
      // raízes finas subindo pelo tronco
      for (let i = 0; i < 10; i++) { const a = R() * PI * 2, q = []; for (let j = 0; j <= 5; j++) { const v2 = j / 5; q.push(V(Math.cos(a + v2 * .6) * (.19 - v2 * .03), .3 + v2 * .55, Math.sin(a + v2 * .6) * (.17 - v2 * .03))); } listaR2.push(tubo(q, t => .018 * (1 - t * .7), { seg: 12, rad: 5 })); }
      const geoRaiz = U2 && U2.mergeBufferGeometries(listaR.concat(listaR2));
      let raizMesh = null, raizBase = null;
      if (geoRaiz) { listaR.concat(listaR2).forEach(q => q.dispose()); raizMesh = malha(raizG, geoRaiz, matRaiz); raizBase = Float32Array.from(geoRaiz.attributes.position.array); }
      else listaR.concat(listaR2).forEach(q => malha(raizG, q, matRaiz));
      // crânio e costelas presos entre as raízes
      const restos = grupo(g);
      const cranio = grupo(restos, .62, .07, .5); cranio.rotation.set(-.3, -.6, .25);
      malha(cranio, deform(new T.SphereGeometry(.075, 16, 12), (x, y, z) => [x * .85, y * (y < -.02 ? .7 : 1), z * 1.05]), matOsso);
      [-1, 1].forEach(sx => { const o = malha(cranio, new T.SphereGeometry(.018, 8, 6), mat({ color: '#0a0604', roughness: 1 })); o.position.set(sx * .025, .0, .07); });
      malha(cranio, new T.BoxGeometry(.05, .02, .03), matOsso).position.set(0, -.055, .045);
      const costelas = grupo(restos, -.55, .03, .55); costelas.rotation.set(0, .9, .15);
      malha(costelas, tubo([[-.2, 0, 0], [-.05, .01, 0], [.1, .005, 0], [.22, 0, 0]], .012, { seg: 10, rad: 5 }), matOsso);
      for (let i = 0; i < 6; i++) { const c2 = malha(costelas, new T.TorusGeometry(.09 - i * .004, .007, 5, 14, PI * .95), matOsso); c2.position.set(-.15 + i * .06, .0, 0); c2.rotation.set(0, PI / 2, 0); c2.scale.set(1, .6, 1); }
      listaR2.length = 0;
      [[.62, .5, 1], [-.55, .55, -1]].forEach(([x0, z0, sg]) => { const q = [V(x0 - .25 * sg, .02, z0 - .2), V(x0 - .05 * sg, .09, z0 - .03), V(x0 + .05 * sg, .1, z0 + .04), V(x0 + .25 * sg, .02, z0 + .15)]; listaR2.push(tubo(q, .014, { seg: 12, rad: 5 })); });
      junta(restos, listaR2, matRaiz);

      /* ---------- tronco, camisa, avental ---------- */
      const corpo = grupo(g, 0, .9, 0); // pivô do balanço na cintura das raízes
      const alto = grupo(corpo, 0, -.9, 0);
      const PT = [[H0, .2, .18, 0], [.6, .17, .15, 0], [.9, .155, .13, 0], [1.1, .145, .105, 0], [1.3, .165, .115, .01], [1.5, .19, .12, .015], [1.64, .21, .11, .01], [1.72, .2, .095, 0], [1.78, .13, .07, .005], [H1, .05, .045, .015]];
      const interp = (P, y) => { if (y <= P[0][0]) return P[0].slice(1); for (let i = 1; i < P.length; i++) if (y <= P[i][0]) { const a = P[i - 1], b = P[i], k = (y - a[0]) / (b[0] - a[0]); return [1, 2, 3].map(j => a[j] + (b[j] - a[j]) * k); } return P[P.length - 1].slice(1); };
      const perfT = []; for (let j = 0; j < 30; j++) { const y = H0 + j / 29 * (H1 - H0), q = interp(PT, y); perfT.push([y, q[0], q[1], q[2]]); }
      malha(alto, casca(perfT, { seg: 32, quadrado: .9, deform: (x, y, z) => { const f = 1 + fbm(x * 8, y * 6, z * 8) * (y < 1 ? .12 : .05); return [x * f, y, z * f]; } }), matTronco);
      // costelas em relevo no peito aberto
      const listaC = []; for (let i = 0; i < 5; i++) { const y = 1.56 - i * .055, [w, d, dz] = interp(PT, y), q = []; for (let k = 0; k <= 6; k++) { const a = (k / 6 - .5) * 1.5; q.push([Math.sin(a) * w * 1.01, y - Math.abs(a) * .03, Math.cos(a) * d * 1.04 + dz]); } listaC.push(tubo(q, t => .009 * (1 - Math.abs(t - .5) * .6), { seg: 12, rad: 5 })); }
      junta(alto, listaC, matOsso);
      const nuc = nucleo(alto, .044, { halo: 10 }); { const [w, d, dz] = interp(PT, 1.53); nuc.g.position.set(0, 1.53, d + dz + .004); }
      // avental: peitilho estreito em cima, saia larga embaixo, barra em farrapos
      const PA = []; for (let j = 0; j < 24; j++) { const y = .22 + j / 23 * 1.2, q = interp(PT, Math.max(y, .55)); const abre = y < 1.1 ? (1.1 - y) * .2 : 0; PA.push([y, q[0] + .025 + abre, q[1] + .03 + abre * .6, q[2]]); }
      malha(alto, casca(PA, { seg: 26, arcoY: (y) => { const a = y > 1.15 ? .6 : 1.55; return [-a, a * 2]; }, deform: (x, y, z) => { const f = 1 + fbm(x * 5, y * 4, z * 5) * .08 + (y < .7 ? Math.sin(Math.atan2(x, z) * 9) * .04 * (.7 - y) : 0); return [x * f, y, z * f]; } }), matAvental);
      // bolso com ferramentas
      const bolso = grupo(alto, .06, .92, 0); { const [w, d, dz] = interp(PT, .92); bolso.position.z = d + .07 + dz; }
      malha(bolso, new T.BoxGeometry(.2, .16, .02), matAvental).position.y = 0;
      [[-.06, .05, -.1], [-.02, .09, .05], [.03, .07, .12], [.07, .04, -.05]].forEach(([x0, h, rz], i) => { const c2 = malha(bolso, new T.CylinderGeometry(.011, .013, .14 + h, 6), i === 2 ? matFerro : matMadeira); c2.position.set(x0, .06 + h / 2, -.005); c2.rotation.z = rz; });
      const pa = malha(bolso, new T.ConeGeometry(.025, .09, 4), matFerro); pa.position.set(.03, .2, -.005); pa.rotation.z = .12; pa.scale.z = .2;
      // amarras na cintura e alças nos ombros
      { const [w, d, dz] = interp(PT, 1.12); const cinta = malha(alto, new T.TorusGeometry(1, .012, 5, 24), matAvental); cinta.position.set(0, 1.12, dz); cinta.scale.set(w + .035, d + .04, 1); cinta.rotation.x = PI / 2; }
      [-1, 1].forEach(sx => { malha(alto, fita([[sx * .1, 1.42, .14], [sx * .14, 1.66, .1], [sx * .15, 1.76, -.02], [sx * .12, 1.62, -.13], [sx * .08, 1.2, -.12]], .035, { seg: 14 }), matAvental); });
      malha(alto, fita([[0, 1.12, -.12], [.02, 1.0, -.16], [-.03, .8, -.17], [.02, .6, -.15]], t => .04 - t * .015, { seg: 10 }), matAvental);

      /* ---------- braços: tesoura de poda numa mão, garras na outra ---------- */
      const bracos = [-1, 1].map(sx => {
        const br = membro(alto, .37, .36, .042, .03, .026, matPele, { seg: 9, ossudo: .6 });
        br.ombro.position.set(sx * .21, 1.69, 0);
        const alvo = sx < 0 ? V(-.44, .98, .16) : V(.52, 1.02, .2), polo = V(sx, -.2, -.6);
        ik(br, alvo, polo);
        // manga da camisa rasgada no braço de cima
        malha(br.braco, deform(new T.CylinderGeometry(.052, .046, .26, 10, 3, true), (x, y, z) => { const f = 1 + fbm(x * 20, y * 20, z * 20) * .25; return [x * f, y - .13 + (y < -.1 ? fbm(x * 40, 0, z * 40) * .05 : 0), z * f]; }), mat({ map: texT, roughness: .9, duplo: true }));
        const m = mao(br.punho, matPele, sx < 0 ? { palma: .09, larg: .075, esp: .026, dedo: 1.25, raio: .01, lado: -1, abrir: .1 } : { palma: .1, larg: .08, esp: .025, dedo: 1.75, raio: .0095, lado: 1, abrir: .38, garra: .12, matGarra: matUnha });
        const dA = posEm(br.punho, g).sub(posEm(br.cot, g)).normalize();
        alinharEm(m.g, g, sx < 0 ? dA.clone().negate() : dA.clone().add(V(0, -.4, .2)).normalize().negate(), sx < 0 ? V(1, 0, 0) : V(-.6, -.2, .7));
        const gav = []; for (let k = 0; k < 3; k++) { const q = [], f0 = R() * 6, L = k < 2 ? .37 : .36, pai = k < 2 ? 0 : 1; for (let j = 0; j <= 16; j++) { const s2 = j / 16, a = f0 + s2 * PI * 2 * (1.4 + k * .3); q.push([Math.cos(a) * (.036 - s2 * .01), -s2 * L, Math.sin(a) * (.036 - s2 * .01)]); } gav.push({ pai, geo: tubo(q, t => .008 * (1 - t * .6), { seg: 32, rad: 4 }) }); }
        gav.forEach(q => malha(q.pai ? br.cot : br.braco, q.geo, matRaiz));
        return { sx, br, m, alvo, polo };
      });
      // tesoura de poda enferrujada na mão direita
      const tes = grupo(bracos[0].m.g, 0, -.07, .028); tes.scale.setScalar(1.4);
      alinharEm(tes, g, V(-.15, 1, -.35), V(-.2, .1, 1));
      const lamina = (sg) => {
        const sh = new T.Shape(), gancho = sg > 0 ? 1 : .55; sh.moveTo(0, .02); sh.quadraticCurveTo(.032 * sg, -.05, .028 * sg, -.15); sh.quadraticCurveTo(.022 * sg, -.25, -.022 * sg * gancho, -.31); sh.quadraticCurveTo(-.004 * sg, -.22, -.005 * sg, -.12); sh.lineTo(-.006 * sg, -.01); sh.lineTo(0, .02);
        const geo = new T.ExtrudeGeometry(sh, { depth: .007, bevelEnabled: true, bevelThickness: .002, bevelSize: .0025, bevelSegments: 1, curveSegments: 10 }); geo.translate(0, 0, -.0035);
        const lg = grupo(tes); malha(lg, geo, matFerro).position.z = sg * .005;
        malha(lg, tubo([[0, .02, 0], [-.015 * sg, .14, 0], [-.03 * sg, .3, 0]], .013, { seg: 8, rad: 6 }), matMadeira).position.z = sg * .005;
        malha(lg, new T.CylinderGeometry(.017, .017, .04, 8), matFerro).position.set(-.006 * sg, .06, sg * .005);
        return lg;
      };
      const laminas = [lamina(1), lamina(-1)];
      malha(tes, new T.CylinderGeometry(.012, .012, .03, 8), matFerro).rotation.x = PI / 2;

      /* ---------- cabeça: chapéu de palha, boca escancarada, olhos brancos ---------- */
      const HC = V(0, 1.98, .04);
      const pesc = malha(alto, tubo([[0, 1.76, .0], [0, 1.85, .02], [0, 1.94, .04]], t => .045 - t * .01, { seg: 6, rad: 10 }), matPele);
      const cab = grupo(alto, HC.x, HC.y, HC.z);
      // rosto pintado: a esfera vai só até theta = 2,05, então a linha da tela é theta / 2,05
      const [ck, xk] = tela(512, 256), lin = th => th / 2.05 * 256, ly = lin(1.45), lb = lin(1.78);
      xk.fillStyle = '#5e4c3a'; xk.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 40; i++) pinta.mancha(xk, R() * 512, R() * 256, 5 + R() * 20, R() < .5 ? '#3e2e20' : '#7a6a52', .3);
      [-1, 1].forEach(s2 => { const go = xk.createRadialGradient(128 + s2 * 30, ly, 2, 128 + s2 * 30, ly, 22); go.addColorStop(0, '#050302'); go.addColorStop(.55, '#22160c'); go.addColorStop(1, 'rgba(50,34,24,0)'); xk.fillStyle = go; xk.fillRect(100 + s2 * 30, ly - 28, 56, 56); });
      xk.fillStyle = '#0e0604'; xk.beginPath(); xk.moveTo(122, lin(1.66)); xk.lineTo(128, lin(1.56)); xk.lineTo(134, lin(1.66)); xk.fill();
      [-1, 1].forEach(s2 => { const go = xk.createRadialGradient(128 + s2 * 44, lb, 2, 128 + s2 * 44, lb, 26); go.addColorStop(0, 'rgba(20,12,6,.85)'); go.addColorStop(1, 'rgba(20,12,6,0)'); xk.fillStyle = go; xk.fillRect(90 + s2 * 44, lb - 30, 76, 60); });
      xk.strokeStyle = 'rgba(30,16,8,.55)'; xk.lineWidth = 1.2; for (let i = 0; i < 4; i++) { xk.beginPath(); xk.moveTo(104, lin(1.1) - i * 7); xk.quadraticCurveTo(128, lin(1.1) - 4 - i * 7, 152, lin(1.1) - i * 7); xk.stroke(); }
      for (let i = 0; i < 16; i++) pinta.veia(xk, R() * 512, R() * 256, R() * 6.3, 30 + R() * 40, 1, '#2a1810', .5, 1);
      pinta.grao(xk, 512, 256, 3000, .1, 1);
      const matCab = mat({ map: tex(ck), roughness: .8 });
      // crânio de cima (aberto embaixo, onde a mandíbula cai)
      malha(cab, deform(new T.SphereGeometry(.1, 26, 18, 0, PI * 2, 0, 2.05), (x, y, z) => { const nx = x / .1, ny = y / .1; const fundo = z > 0 ? .014 * Math.exp(-Math.pow(Math.abs(nx) - .45, 2) / .03 - Math.pow(ny + .3, 2) / .05) : 0, orb = z > 0 ? .018 * Math.exp(-Math.pow(Math.abs(nx) - .29, 2) / .012 - Math.pow(ny - .12, 2) / .012) : 0; return [x * .8 * (1 - fundo * 7), y * 1.15, z * .98 - orb]; }), matCab);
      const boca = malha(cab, new T.SphereGeometry(.07, 12, 10), mat({ color: '#0e0402', roughness: 1 })); boca.position.set(0, -.09, .015); boca.scale.set(.75, 1.7, .9);
      const dentes = mat({ color: '#b8a878', roughness: .5 });
      const dC = grupo(cab); for (let i = 0; i < 9; i++) { const a = (i / 8 - .5) * 1.7, d2 = malha(dC, new T.ConeGeometry(.0065, .03 + R() * .025, 5), dentes); d2.position.set(Math.sin(a) * .058, -.058, Math.cos(a) * .072 + .005); d2.rotation.set(PI + .1, 0, 0); }
      const mand = grupo(cab, 0, -.035, -.02);
      malha(mand, deform(new T.SphereGeometry(.08, 18, 10, 0, PI * 2, PI * .55, PI * .45), (x, y, z) => [x * .7, y * 1.6, z * .9 + .02]), matCab);
      const dM = grupo(mand); for (let i = 0; i < 9; i++) { const a = (i / 8 - .5) * 1.5, d2 = malha(dM, new T.ConeGeometry(.0062, .028 + R() * .03, 5), dentes); d2.position.set(Math.sin(a) * .05, -.05, Math.cos(a) * .065 + .022); }
      assar(dC); assar(dM);
      const matOlhoB = mat({ color: '#b8b6a0', emissive: '#dfe8c8', emissiveIntensity: .75, roughness: .2 });
      [-1, 1].forEach(sx => { const o = malha(cab, new T.SphereGeometry(.0105, 10, 8), matOlhoB); o.position.set(sx * .029, .014, .074); o.scale.set(1, .75, 1); K.halo(cab, '#dfeccc', .035, sx * .029, .014, .09); });
      // cabelo grisalho em fios ralos
      const fiosC = [];
      for (let i = 0; i < 40; i++) { const a = PI + (i / 39 - .5) * 4.2, sx = Math.sin(a), sz = Math.cos(a), L = .2 + R() * .25, q = []; for (let j = 0; j <= 4; j++) { const v2 = j / 4; q.push([sx * (.085 + v2 * .05), .02 - v2 * L, sz * (.085 + v2 * .05) - (sz < 0 ? v2 * .03 : 0) + (R() - .5) * .02]); } fiosC.push(tubo(q, t => .003 * (1 - t * .6), { seg: 8, rad: 3 })); }
      junta(cab, fiosC, mat({ color: '#3a372f', roughness: .75 }));
      // chapéu de palha
      const chapeu = grupo(cab, 0, .075, -.005); chapeu.rotation.set(-.12, 0, .1);
      const pf = [[0, .14], [.07, .138], [.105, .12], [.118, .07], [.122, .015], [.13, 0], [.19, -.012], [.25, -.03], [.29, -.055], [.31, -.075]].map(([r, y]) => new T.Vector2(r, y));
      malha(chapeu, deform(new T.LatheGeometry(pf, 30), (x, y, z) => { const r = Math.hypot(x, z); return r > .14 ? [x, y + fbm(x * 12, 0, z * 12) * .025 * (r - .14) / .17, z] : [x, y + (r < .1 ? fbm(x * 30, 1, z * 30) * .006 : 0), z]; }), matPalha);
      malha(chapeu, new T.TorusGeometry(.123, .008, 5, 24), mat({ color: '#3a2a1a', roughness: .9 })).rotation.x = PI / 2;
      chapeu.children[1].position.y = .02;

      /* ---------- galhos com folhas saindo dos ombros e dos braços ---------- */
      const galhos = [];
      const fazGalho = (pai, p0, dir0, comp, r0, niv, listaG, listaF) => {
        const pts = [p0.clone()], d = dir0.clone().normalize(), n = 5;
        let p = p0.clone();
        for (let k = 1; k <= n; k++) { d.add(V((R() - .5) * .5, (R() - .2) * .3, (R() - .5) * .5)).normalize(); p = p.clone().addScaledVector(d, comp / n); pts.push(p); }
        listaG.push(tubo(pts, t => r0 * (1 - t * .8), { seg: 10, rad: niv > 1 ? 6 : 4 }));
        const curva = new T.CatmullRomCurve3(pts);
        if (niv > 0) { const nf = niv > 1 ? 3 : 2; for (let k = 0; k < nf; k++) { const u = .35 + R() * .6, q = curva.getPointAt(u), tg = curva.getTangentAt(u); const nd = tg.clone().add(V((R() - .5) * 1.6, R() * .8, (R() - .5) * 1.6)); fazGalho(pai, q, nd, comp * (.5 + R() * .2), r0 * .55, niv - 1, listaG, listaF); } }
        if (niv <= 1) { const nfo = niv ? 7 : 9; for (let k = 0; k < nfo; k++) { const u = .25 + R() * .75, q = curva.getPointAt(u), tg = curva.getTangentAt(u); const fo = new T.PlaneGeometry(.055, .085); fo.translate(0, .042, 0); const v = (R() * 4) | 0, uv = fo.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setXY(j, (v % 2) * .5 + uv.getX(j) * .5, (1 - Math.floor(v / 2)) * .5 + uv.getY(j) * .5); const o = new T.Object3D(); o.position.copy(q); o.lookAt(q.clone().add(V((R() - .5), (R() - .5), (R() - .5)))); o.rotateX(-PI / 2 + (R() - .5)); o.rotateZ((R() - .5) * 2); o.updateMatrix(); fo.applyMatrix4(o.matrix); listaF.push(fo); } }
      };
      const fazCopa = (pai, p0, dir, comp, r0, niv) => { const lg = [], lf = []; fazGalho(pai, p0, dir, comp, r0, niv, lg, lf); junta(pai, lg, matGalho); junta(pai, lf, matFolha); };
      [-1, 1].forEach(sx => {
        const gO = grupo(alto, sx * .17, 1.72, -.02); galhos.push({ g: gO, f: sx });
        fazCopa(gO, V(0, 0, 0), V(sx * 1.1, 1, -.05), .62, .034, 2);
        fazCopa(gO, V(sx * .02, 0, -.04), V(sx * .35, 1, -.45), .5, .026, 2);
        fazCopa(gO, V(sx * -.03, .02, .02), V(sx * .2, 1, .15), .38, .02, 1);
      });
      bracos.forEach(b => {
        const gB = grupo(b.br.braco, 0, -.14, 0); galhos.push({ g: gB, f: b.sx * 2 });
        fazCopa(gB, V(0, 0, 0), V(b.sx * 1, .3, -.2), .26, .016, 1);
        const gA = grupo(b.br.cot, 0, -.12, 0); galhos.push({ g: gA, f: b.sx * 3 });
        fazCopa(gA, V(0, 0, 0), V(b.sx * 1, .5, .3), .2, .013, 1);
      });

      /* ---------- animação: plantado no lugar; range, balança, estala a tesoura, as raízes se mexem ---------- */
      const posR = raizMesh ? raizMesh.geometry.attributes.position : null;
      let agit = 0, quadro = 0;
      const anim = (dt, t, andando) => {
        agit += ((andando ? 1 : 0) - agit) * Math.min(1, dt * 2);
        // rangido: balanço lento que trava e solta aos trancos
        const trava = Math.round(Math.sin(t * .7) * 6) / 6, solta = Math.sin(t * .7) * .3 + trava * .7;
        corpo.rotation.z = solta * .045 + Math.sin(t * 13) * .002 * agit;
        corpo.rotation.x = -.04 + Math.sin(t * .43) * .02 + (Math.sin(t * .23) > .96 ? .03 : 0);
        corpo.rotation.y = Math.sin(t * .31) * .05;
        // cabeça jogada para trás, boca que abre num grito mudo
        const grito = Math.pow(Math.max(0, Math.sin(t * .55)), 4);
        cab.rotation.set(-.32 - grito * .15 + Math.sin(t * .8) * .02, Math.sin(t * .37) * .12 + (Math.sin(t * 5.1) > .985 ? .25 : 0), Math.sin(t * .5) * .06);
        mand.rotation.x = .62 + grito * .32 + Math.sin(t * 9) * .02 * grito;
        // tesoura: estala de tempos em tempos
        const ciclo = (t % 3.2) / 3.2, ab = ciclo < .55 ? ciclo / .55 * .55 : ciclo < .62 ? .55 * (1 - (ciclo - .55) / .07) : 0;
        laminas[0].rotation.z = ab / 2; laminas[1].rotation.z = -ab / 2;
        // garras abrem e fecham devagar, com tique
        const tq = Math.sin(t * 7.7) > .97 ? .35 : 0;
        bracos[1].m.curvar([.2 + Math.sin(t * .9) * .15 + tq, .25 + Math.sin(t * .9 + .4) * .15, .3 + Math.sin(t * .9 + .8) * .15 + tq, .35 + Math.sin(t * .9 + 1.2) * .15, .2], .04, t);
        bracos[0].m.curvar(.85, .02, t);
        bracos.forEach((b, i) => { const a = b.alvo.clone().add(V(0, Math.sin(t * .6 + i) * .02, Math.sin(t * .4 + i * 2) * .02)); ik(b.br, a, b.polo); });
        // galhos e folhas ao vento
        galhos.forEach((gq, i) => { gq.g.rotation.x = Math.sin(t * 1.1 + i) * .03 * (1 + agit); gq.g.rotation.z = Math.sin(t * .9 + i * 1.7) * .035 * (1 + agit); });
        // raízes: as pontas se contorcem (mais se o Mestre tenta arrastá-lo)
        quadro++;
        if (posR && quadro % 2 === 0) {
          const amp = .012 + agit * .03;
          for (let k = 0; k < posR.count; k++) {
            const bx = raizBase[k * 3], by = raizBase[k * 3 + 1], bz = raizBase[k * 3 + 2], r = Math.hypot(bx, bz);
            if (r < .45) continue;
            const f = Math.min(1, (r - .45) / .6), an = Math.atan2(bz, bx);
            posR.setXYZ(k, bx + Math.sin(t * 2.3 + an * 5) * amp * f * .6, by + Math.max(0, Math.sin(t * 1.7 + an * 7 + r * 4)) * amp * f, bz + Math.cos(t * 2.1 + an * 4) * amp * f * .6);
          }
          posR.needsUpdate = true; raizMesh.geometry.computeVertexNormals();
        }
        nuc.pulso(t);
      };
      anim(0, 0, false);
      return { g, alt: 2.45, raioBase: .7, anim };
    },
  };
})();

/* ===== forma: esfolado ===== */
(() => {
  const NS = window.ACF3D = window.ACF3D || {};
  /* ===== kit de modelagem orgânica (igual em todas as formas, para cada arquivo funcionar sozinho) ===== */
  function kit(F, s) {
    const T = F.T;
    const L = c => new T.Color(c).convertSRGBToLinear();
    // semente a partir do id do ser: vários iguais na mesma sala saem diferentes
    let h = 2166136261; String((s && s.id) || 'x').split('').forEach(ch => { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); });
    const semente = (h >>> 0) % 99991;
    const rngDe = n => { let a = (n * 2654435761) >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
    const rng = rngDe(semente + 7);
    const tela = (w, hh) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; return [c, c.getContext('2d')]; };
    // material PBR guardado (cores escritas como aparecem na tela)
    const mat = (o = {}) => {
      const p = { color: L(o.cor || '#ffffff'), roughness: o.r ?? .7, metalness: o.me ?? 0 };
      if (o.e) { p.emissive = L(o.e); p.emissiveIntensity = o.ei ?? 1; }
      if (o.mapa) p.map = o.mapa; if (o.bump) { p.bumpMap = o.bump; p.bumpScale = o.bs ?? 1; }
      if (o.rMapa) p.roughnessMap = o.rMapa; if (o.emiMapa) p.emissiveMap = o.emiMapa;
      if (o.vc) p.vertexColors = true; if (o.lado) p.side = T.DoubleSide;
      if (o.alfa) p.alphaTest = o.alfa;
      if (o.op !== undefined) { p.transparent = true; p.opacity = o.op; p.depthWrite = false; }
      const m = F.guardar(new T.MeshStandardMaterial(p));
      if (o.flat) m.flatShading = true;
      return m;
    };
    const tex = (c, rep) => F.texCanvas(c, rep || [1, 1]);
    // ruído de valor 3D e fbm (0 a ~0,9)
    const hs = (x, y, z) => { const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + semente * .0131) * 43758.5453; return v - Math.floor(v); };
    const hf = (x, y, z) => { const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return v - Math.floor(v); };
    const sm = t => t * t * (3 - 2 * t);
    const lerp = (a, b, t) => a + (b - a) * t;
    function ruido(x, y, z) {
      const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = sm(x - ix), fy = sm(y - iy), fz = sm(z - iz);
      const a = (i, j, k) => hs(ix + i, iy + j, iz + k);
      return lerp(lerp(lerp(a(0, 0, 0), a(1, 0, 0), fx), lerp(a(0, 1, 0), a(1, 1, 0), fx), fy), lerp(lerp(a(0, 0, 1), a(1, 0, 1), fx), lerp(a(0, 1, 1), a(1, 1, 1), fx), fy), fz);
    }
    const fbm = (x, y, z, n = 3) => { let r = 0, a = .5, f = 1; for (let i = 0; i < n; i++) { r += a * ruido(x * f + i * 17, y * f, z * f); a *= .5; f *= 2.03; } return r; };
    // células (placas): distância à 1ª e à 2ª semente e um id por placa
    function celula(x, y, z) {
      const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z); let f1 = 9, f2 = 9, id = 0;
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
        const cx = ix + i, cy = iy + j, cz = iz + k;
        const dx = cx + hf(cx, cy, cz) - x, dy = cy + hf(cy + 3.1, cz, cx) - y, dz = cz + hf(cz - 7.7, cx, cy) - z, d = dx * dx + dy * dy + dz * dz;
        if (d < f1) { f2 = f1; f1 = d; id = hf(cx * 1.7, cy * 2.3, cz * 3.1); } else if (d < f2) f2 = d;
      }
      return [Math.sqrt(f1), Math.sqrt(f2), id];
    }
    // normais suaves sem costura (vértices na mesma posição dividem a normal)
    function suavizar(geo) {
      geo.computeVertexNormals();
      const p = geo.attributes.position, n = geo.attributes.normal, mapa = new Map();
      for (let i = 0; i < p.count; i++) { const k = p.getX(i).toFixed(4) + ',' + p.getY(i).toFixed(4) + ',' + p.getZ(i).toFixed(4); let a = mapa.get(k); if (!a) { a = []; mapa.set(k, a); } a.push(i); }
      mapa.forEach(a => { if (a.length < 2) return; let x = 0, y = 0, z = 0; a.forEach(i => { x += n.getX(i); y += n.getY(i); z += n.getZ(i); }); const l = Math.hypot(x, y, z) || 1; a.forEach(i => n.setXYZ(i, x / l, y / l, z / l)); });
      return geo;
    }
    // cor por vértice (função da posição) para poder juntar e sombrear regiões
    function pintar(geo, fn) {
      const p = geo.attributes.position, c = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const v = typeof fn === 'function' ? fn(p.getX(i), p.getY(i), p.getZ(i)) : fn; c[i * 3] = v[0]; c[i * 3 + 1] = v[1]; c[i * 3 + 2] = v[2]; }
      geo.setAttribute('color', new T.BufferAttribute(c, 3)); return geo;
    }
    const BRANCO = [1, 1, 1];
    // junta várias geometrias indexadas em uma (menos chamadas de desenho)
    function juntar(geos) {
      geos = geos.filter(Boolean).map(g => { if (!g.index) { const n = g.attributes.position.count, ix = []; for (let i = 0; i < n; i++) ix.push(i); g.setIndex(ix); } if (!g.attributes.color) pintar(g, BRANCO); if (!g.attributes.uv) g.setAttribute('uv', new T.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); if (!g.attributes.normal) g.computeVertexNormals(); return g; });
      let nv = 0, ni = 0; geos.forEach(g => { nv += g.attributes.position.count; ni += g.index.count; });
      const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), C = new Float32Array(nv * 3), I = new (nv > 65535 ? Uint32Array : Uint16Array)(ni);
      let ov = 0, oi = 0;
      geos.forEach(g => { const c = g.attributes.position.count; P.set(g.attributes.position.array, ov * 3); N.set(g.attributes.normal.array, ov * 3); U.set(g.attributes.uv.array, ov * 2); C.set(g.attributes.color.array, ov * 3); const ix = g.index.array; for (let i = 0; i < ix.length; i++) I[oi + i] = ix[i] + ov; ov += c; oi += ix.length; g.dispose(); });
      const r = new T.BufferGeometry(); r.setAttribute('position', new T.BufferAttribute(P, 3)); r.setAttribute('normal', new T.BufferAttribute(N, 3)); r.setAttribute('uv', new T.BufferAttribute(U, 2)); r.setAttribute('color', new T.BufferAttribute(C, 3)); r.setIndex(new T.BufferAttribute(I, 1));
      return r;
    }
    // aplica posição/rotação/escala numa geometria (para juntar peças já no lugar)
    const _o = new T.Object3D();
    function por(geo, pos = [0, 0, 0], rot = [0, 0, 0], esc = [1, 1, 1]) { _o.position.set(...pos); _o.rotation.set(...rot); _o.scale.set(...(Array.isArray(esc) ? esc : [esc, esc, esc])); _o.updateMatrix(); geo.applyMatrix4(_o.matrix); return geo; }
    function malha(pai, geo, m, pos, rot) { const me = new T.Mesh(F.guardar(geo), m); if (pos) me.position.set(...pos); if (rot) me.rotation.set(...rot); pai.add(me); return me; }
    function junta(pai, x = 0, y = 0, z = 0) { const j = new T.Group(); j.position.set(x, y, z); pai.add(j); return j; }

    /* tubo orgânico que passa pelos pontos pts ([x,y,z]); raios: números ou [largura, profundidade] ao longo.
       o: { nr, nl, ref, ruido, fq, deform(q, dir, t, a) → deslocamento, cor(q, t, a) → [r,g,b] ou cor fixa,
       ini, fim (pontas arredondadas: fração do raio; negativo = sem tampa), uvV (repetição ao longo) } */
    function tubo(pts, raios, o = {}) {
      const nr = o.nr || 10, nl = o.nl || Math.max(6, pts.length * 4);
      const V = pts.map(p => new T.Vector3(p[0], p[1], p[2]));
      const curva = V.length === 2 ? new T.LineCurve3(V[0], V[1]) : new T.CatmullRomCurve3(V, false, 'centripetal');
      const ref = new T.Vector3(...(o.ref || [0, 0, 1]));
      const RR = raios.map(r => Array.isArray(r) ? r : [r, r]);
      const R = t => { if (RR.length === 1) return RR[0]; const k = t * (RR.length - 1), i = Math.min(RR.length - 2, Math.floor(k)), f = sm(k - i); return [lerp(RR[i][0], RR[i + 1][0], f), lerp(RR[i][1], RR[i + 1][1], f)]; };
      const pos = [], uv = [], idx = [], col = [];
      const P = new T.Vector3(), Tg = new T.Vector3(), Lx = new T.Vector3(), Lz = new T.Vector3(), q = new T.Vector3(), dir = new T.Vector3();
      const fq = o.fq || 9, aneis = [];
      const corF = !o.cor ? null : typeof o.cor === 'function' ? o.cor : () => o.cor;
      for (let i = 0; i <= nl; i++) {
        const t = i / nl; curva.getPointAt(t, P); curva.getTangentAt(t, Tg);
        Lx.crossVectors(Tg, ref); if (Lx.lengthSq() < 1e-8) Lx.set(1, 0, 0); Lx.normalize(); Lz.crossVectors(Lx, Tg).normalize();
        const [rx, rz] = R(t); aneis.push([P.clone(), Tg.clone(), Math.max(rx, rz)]);
        for (let j = 0; j <= nr; j++) {
          const a = (j / nr - .5) * Math.PI * 2, sa = Math.sin(a), ca = Math.cos(a);
          q.copy(P).addScaledVector(Lx, sa * rx).addScaledVector(Lz, ca * rz);
          dir.copy(Lx).multiplyScalar(sa * rz).addScaledVector(Lz, ca * rx).normalize();
          let d = 0;
          if (o.ruido) d += (fbm(q.x * fq + 3, q.y * fq, q.z * fq) - .44) * o.ruido;
          if (o.deform) d += o.deform(q, dir, t, a) || 0;
          q.addScaledVector(dir, d);
          pos.push(q.x, q.y, q.z); uv.push(j / nr, t * (o.uvV || 1));
          const c = corF ? corF(q, t, a) : BRANCO; col.push(c[0], c[1], c[2]);
        }
      }
      const W = nr + 1;
      for (let i = 0; i < nl; i++) for (let j = 0; j < nr; j++) { const a = i * W + j, b = a + W; idx.push(a, a + 1, b, b, a + 1, b + 1); }
      // tampas arredondadas (polo empurrado para fora)
      const tampa = (anel, k, sinal) => {
        if (k < 0) return; const [Pc, Tc, r] = aneis[anel]; const pp = Pc.clone().addScaledVector(Tc, sinal * r * k);
        const c = corF ? corF(pp, anel ? 1 : 0, 0) : BRANCO; const iv = pos.length / 3; pos.push(pp.x, pp.y, pp.z); uv.push(.5, anel ? (o.uvV || 1) : 0); col.push(c[0], c[1], c[2]);
        for (let j = 0; j < nr; j++) { const a = anel * W + j; if (sinal > 0) idx.push(a, a + 1, iv); else idx.push(a + 1, a, iv); }
      };
      tampa(0, o.ini ?? .5, -1); tampa(nl, o.fim ?? .5, 1);
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx);
      return suavizar(g);
    }
    // elipsoide deformado: def(x,y,z na esfera unitária) → [x,y,z]; ruído opcional
    function bolha(rx, ry, rz, o = {}) {
      const g = new T.SphereGeometry(1, o.ws || 20, o.hs || 14), p = g.attributes.position, fq = o.fq || 3;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        if (o.def) [x, y, z] = o.def(x, y, z);
        let k = 1; if (o.ruido) k += (fbm(x * fq + 5, y * fq, z * fq) - .44) * o.ruido;
        p.setXYZ(i, x * rx * k, y * ry * k, z * rz * k);
      }
      if (o.cor) pintar(g, typeof o.cor === 'function' ? (x, y, z) => o.cor({ x, y, z }) : o.cor); return suavizar(g);
    }
    // cones (dentes, garras, espinhos) juntos: lista de [pos, dir, comp, raio]
    function espinhos(lista, o = {}) {
      const geos = lista.map(([p, d, comp, r]) => { const g = new T.ConeGeometry(r, comp, o.lados || 5, 1); g.translate(0, comp / 2, 0); const v = new T.Vector3(...d).normalize(); g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), v)); g.translate(...p); pintar(g, o.c || BRANCO); return g; });
      return juntar(geos);
    }
    /* núcleo roxo no peito: esfera brilhante numa moldura escura de espinhos (como aranha) */
    function nucleo(pai, r, pos, rot, o = {}) {
      const g = junta(pai, ...pos); if (rot) g.rotation.set(...rot);
      const mN = mat({ cor: '#2a0844', e: '#8f2bff', ei: 1.4, r: .15, me: .1 });
      const esf = malha(g, new T.SphereGeometry(r, 20, 14), mN, [0, 0, r * .25]);
      const brilho = F.guardar(new T.MeshBasicMaterial({ color: L('#7a20ff'), transparent: true, opacity: .28, blending: T.AdditiveBlending, depthWrite: false }));
      const halo = malha(g, new T.SphereGeometry(r * 1.9, 16, 12), brilho, [0, 0, r * .4]);
      const mM = mat({ cor: '#140a10', r: .35, me: .45 });
      const pecas = [por(new T.TorusGeometry(r * 1.18, r * .2, 6, 24), [0, 0, r * .1])];
      const n = o.pernas || 8;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + .2, ca = Math.cos(a), sa = Math.sin(a), R1 = r * 1.2, R2 = r * (2.1 + (i % 2) * .5), R3 = r * (2.9 + (i % 3) * .4);
        pecas.push(tubo([[ca * R1, sa * R1, r * .15], [ca * R2, sa * R2, r * .55], [ca * R3, sa * R3, -r * .1]], [r * .13, r * .1, r * .02], { nr: 5, nl: 6, fim: 1.5 }));
      }
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; pecas.push(por(new T.ConeGeometry(r * .1, r * .55, 4), [Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3, r * .35], [0, 0, a - Math.PI / 2])); }
      malha(g, juntar(pecas), mM);
      const pulso = (t, extra = 0) => { const k = .5 + .5 * Math.sin(t * 1.3) * Math.sin(t * .37 + 1); mN.emissiveIntensity = .9 + k * 1.3 + extra; brilho.opacity = .1 + k * .2; halo.scale.setScalar(.85 + k * .35); };
      return { g, pulso, mat: mN };
    }
    return { T, L, mat, tex, tela, rng, rngDe, semente, ruido, fbm, celula, hs, hf, sm, lerp, suavizar, pintar, juntar, por, malha, junta, tubo, bolha, espinhos, nucleo };
  }
  /* Humanoide esfolado: alto e magro, músculo vermelho exposto, veias, braços longos com garras.
     Vários na mesma sala: a semente (id do ser) muda altura, crânio, postura, orelhas e se tem língua. */
  (NS.formasFilho = NS.formasFilho || {}).esfolado = {
    nome: 'Esfolado (carne viva)',
    criar: (F, s) => {
      const K = kit(F, s), { T, mat, tubo, bolha, malha, junta, juntar, por, pintar, fbm, rng } = K;
      const g = new T.Group();
      // variações pela semente
      const V = { alt: 2.38 + rng() * .24, cranio: Math.floor(rng() * 3), lingua: rng() < .45, corcunda: .3 + rng() * .2, inclina: (rng() - .5) * .5, braco: 1 + rng() * .1, orelha: .8 + rng() * .5, magro: .9 + rng() * .18 };
      const k = V.alt / 2.25, w = V.magro;

      /* ---------- texturas: músculo esfolado com fibras, sulcos, fáscia e veias ---------- */
      const [c, x] = K.tela(512, 512), [cb, xb] = K.tela(256, 256), r2 = K.rngDe(311);
      x.fillStyle = '#4c0e0c'; x.fillRect(0, 0, 512, 512); xb.fillStyle = '#808080'; xb.fillRect(0, 0, 256, 256);
      // grandes massas: claras (músculo inchado) e escuras (sulcos com sangue)
      const mancha = (cx, cy, r, cor, a) => { const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, cor.replace('A', a)); gr.addColorStop(1, cor.replace('A', 0)); x.fillStyle = gr; x.fillRect(cx - r, cy - r, r * 2, r * 2); };
      for (let i = 0; i < 70; i++) mancha(r2() * 512, r2() * 512, 30 + r2() * 70, r2() < .55 ? 'rgba(140,40,28,A)' : 'rgba(26,4,4,A)', .35 + r2() * .35);
      // feixes de fibra (no mapa de cor e no relevo)
      const feixe = (n, lmin, lmax, wmin, wmax, cores, a, relevo) => { for (let i = 0; i < n; i++) { const x0 = r2() * 512, y0 = r2() * 512 - 60, l = lmin + r2() * (lmax - lmin), dx = (r2() - .5) * 30, wd = wmin + r2() * (wmax - wmin); x.strokeStyle = cores[Math.floor(r2() * cores.length)]; x.globalAlpha = a * (.5 + r2() * .5); x.lineWidth = wd; x.lineCap = 'round'; x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo(x0 + dx, y0 + l / 2, x0 + dx * .3, y0 + l); x.stroke(); if (relevo) { xb.strokeStyle = relevo; xb.globalAlpha = x.globalAlpha * .8; xb.lineWidth = wd / 2; xb.beginPath(); xb.moveTo(x0 / 2, y0 / 2); xb.quadraticCurveTo((x0 + dx) / 2, (y0 + l / 2) / 2, (x0 + dx * .3) / 2, (y0 + l) / 2); xb.stroke(); } } x.globalAlpha = 1; xb.globalAlpha = 1; };
      feixe(260, 40, 160, 4, 11, ['#6e1a14', '#5a1410', '#7a2418'], .4, '#b0b0b0');
      for (let i = 0; i < 90; i++) { const cx = r2() * 512, cy = r2() * 512, rw = 6 + r2() * 12, rh = 25 + r2() * 50; x.strokeStyle = 'rgba(20,2,2,.2)'; x.lineWidth = 2; x.beginPath(); x.ellipse(cx, cy, rw, rh, (r2() - .5) * .4, 0, 7); x.stroke(); }
      feixe(60, 60, 200, 2, 4, ['#2a0505', '#1c0303'], .6, '#202020');
      feixe(400, 20, 90, 1, 2, ['#9a3426', '#4a0b09'], .22, null);
      for (let i = 0; i < 40; i++) { const yy = r2() * 512; x.strokeStyle = 'rgba(200,150,130,.08)'; x.lineWidth = 3 + r2() * 5; x.beginPath(); x.moveTo(r2() * 512, yy); x.lineTo(r2() * 512, yy + (r2() - .5) * 40); x.stroke(); }
      for (let i = 0; i < 18; i++) { x.fillStyle = `rgba(214,160,138,${.06 + r2() * .1})`; x.beginPath(); x.ellipse(r2() * 512, r2() * 512, 6 + r2() * 18, 18 + r2() * 50, (r2() - .5) * .5, 0, 7); x.fill(); }
      // veias escuras que se ramificam
      const veia = (x0, y0, l, wd, prof) => { let px = x0, py = y0, ang = Math.PI / 2 + (r2() - .5) * .6; x.lineCap = 'round'; for (let i = 0; i < l; i++) { const nx = px + Math.cos(ang) * 7, ny = py + Math.sin(ang) * 7; x.strokeStyle = '#2a0718'; x.lineWidth = wd * (1 - i / l * .6); x.globalAlpha = .7; x.beginPath(); x.moveTo(px, py); x.lineTo(nx, ny); x.stroke(); xb.strokeStyle = '#b0b0b0'; xb.lineWidth = wd * .9; xb.globalAlpha = .45; xb.beginPath(); xb.moveTo(px / 2, py / 2); xb.lineTo(nx / 2, ny / 2); xb.stroke(); px = nx; py = ny; ang += (r2() - .5) * .5; if (prof < 2 && r2() < .07) veia(px, py, l * .5, wd * .6, prof + 1); } x.globalAlpha = 1; xb.globalAlpha = 1; };
      for (let i = 0; i < 12; i++) veia(r2() * 512, r2() * 512, 18 + r2() * 26, 2.5 + r2() * 2, 0);
      xb.filter = 'blur(1.5px)'; xb.drawImage(cb, 0, 0); xb.filter = 'none';
      const tCarne = K.tex(c, [1, 1.5]), tRel = K.tex(cb, [1, 1.5]);
      const mCarne = mat({ mapa: tCarne, bump: tRel, bs: .045, r: .5, vc: true });
      const mOsso = mat({ cor: '#cdb98f', r: .35 });
      const mBoca = mat({ cor: '#1c0303', r: .25 });
      const mOlho = mat({ cor: '#1a0c04', e: '#ffb347', ei: .55, r: .05 });

      // cor por vértice: manchas e regiões mais escuras (extremidades enegrecidas como sangue seco)
      const tom = (escuro = 1, tend = 0) => (q, t = .5) => { const n = fbm(q.x * 7, q.y * 7, q.z * 7), v = (.5 + n * .55) * escuro, e = tend * K.sm(Math.max(0, Math.min(1, (t - .78) / .2))) * (.6 + n * .6); return [v + e * .55, v * (.78 + n * .1) + e * .45, v * .8 + e * .4]; };
      // fibras em faixas (relevo dos feixes musculares)
      const faixas = (amp, n) => (q, d, t, a) => amp * Math.sin(a * n + t * 3) * .5;

      const corpo = junta(g, 0, 0, 0);
      const quadril = junta(corpo, 0, 1.05 * k, 0);

      /* ---------- pernas (longas e secas) ---------- */
      const pernas = [-1, 1].map(sd => {
        const coxa = junta(quadril, sd * .1 * k, -.02 * k, 0);
        malha(coxa, tubo([[0, .1 * k, -.01 * k], [0, -.2 * k, .02 * k], [0, -.49 * k, .03 * k]], [[.08 * w, .085 * w], [.082 * w, .088 * w], [.06 * w, .066 * w], [.048, .052]].map(r => r.map(v => v * k)), { nr: 10, nl: 11, deform: faixas(.009 * k, 4), cor: tom(.95, .5), ruido: .01, fim: .9 }), mCarne);
        const joelho = junta(coxa, 0, -.49 * k, .03 * k);
        malha(joelho, juntar([
          tubo([[0, .02 * k, 0], [0, -.15 * k, -.012 * k], [0, -.47 * k, -.03 * k]], [[.046, .05], [.05, .068], [.038, .045], [.03, .033]].map(r => r.map(v => v * k * w)), { nr: 10, nl: 12, deform: (q, d, t, a) => (Math.cos(a) < -.2 && t < .55 ? .012 * k * Math.sin(t / .55 * Math.PI) : 0) + .004 * Math.sin(a * 5), cor: tom(.7, .8), ini: 1, fim: .8 }),
          bolha(.04 * k, .035 * k, .03 * k, { cor: tom(.75), def: (x0, y0, z0) => [x0, y0, z0] }).translate(0, 0, .03 * k), // rótula
        ]), mCarne);
        const tornozelo = junta(joelho, 0, -.47 * k, -.03 * k);
        const pe = [tubo([[0, .01, -.04 * k], [0, -.035 * k, .05 * k], [0, -.05 * k, .14 * k]], [[.032, .036], [.04, .03], [.045, .022]].map(r => r.map(v => v * k)), { nr: 8, nl: 8, cor: tom(.6) })];
        for (let i = 0; i < 4; i++) { const xx = (i - 1.5) * .022 * k, l = (.1 - Math.abs(i - 1.2) * .015) * k; pe.push(tubo([[xx, -.05 * k, .13 * k], [xx * 1.2, -.055 * k, .13 * k + l * .6], [xx * 1.3, -.07 * k, .13 * k + l]], [.012 * k, .01 * k, .006 * k], { nr: 5, nl: 5, fim: 1.6, cor: q => q.z > .13 * k + l * .75 ? [.08, .05, .05] : tom(.55)(q) })); }
        malha(tornozelo, juntar(pe), mCarne);
        return { coxa, joelho, tornozelo };
      });

      /* ---------- tronco: bacia, cintura seca, costelas ---------- */
      const bacia = juntar([
        tubo([[0, -.1 * k, -.01 * k], [0, .1 * k, 0], [0, .3 * k, .02 * k]], [[.155 * w, .105], [.098 * w, .075], [.118 * w, .082]].map(r => r.map(v => v * k)), { nr: 16, nl: 10, deform: (q, d, t, a) => (Math.abs(Math.sin(a)) < .35 && Math.cos(a) > 0 ? -.008 * k : 0) + (Math.cos(a) > .3 && t > .3 ? .006 * k * Math.sin(t * 22) : 0), cor: tom(.85) }),
        ...[-1, 1].map(sd => por(bolha(.07 * k * w, .085 * k, .06 * k, { ws: 14, hs: 10, cor: tom(.7), ruido: .15 }), [sd * .07 * k * w, -.01 * k, -.06 * k], [0, sd * -.3, sd * .1])),
        ...[-1, 1].map(sd => tubo([[sd * .02 * k, .26 * k, .085 * k], [sd * .07 * k, .05 * k, .08 * k], [sd * .1 * k, -.04 * k, .05 * k]], [.012 * k, .016 * k, .01 * k], { nr: 6, nl: 8, cor: tom(1.1) })),
      ]);
      malha(quadril, bacia, mCarne);
      const peito = junta(quadril, 0, .27 * k, .02 * k); peito.rotation.x = V.corcunda;
      const costelas = [];
      for (let i = 0; i < 6; i++) for (const sd of [-1, 1]) {
        const y = .02 + i * .045, rx = (.135 + i * .008) * w, rz = .1 + i * .003, pts = [];
        for (let j = 0; j <= 6; j++) { const a = sd * (2.3 - j * .3); pts.push([Math.sin(a) * rx * k * 1.04, (y - j * .012 + .02) * k, Math.cos(a) * rz * k * 1.05]); }
        costelas.push(tubo(pts, [.009 * k, .011 * k, .007 * k], { nr: 4, nl: 8, cor: tom(1.15) }));
      }
      const tronco = juntar([
        tubo([[0, -.05 * k, 0], [0, .12 * k, .015 * k], [0, .27 * k, .02 * k], [0, .38 * k, -.01 * k]], [[.112 * w, .082], [.15 * w, .108], [.18 * w, .115], [.12 * w, .085]].map(r => r.map(v => v * k)), { nr: 15, nl: 13, deform: (q, d, t, a) => (Math.cos(a) > .85 ? -.01 * k : 0) + (Math.cos(a) < -.9 ? -.008 * k : 0), cor: tom(.9) }),
        ...costelas,
        // peitorais, deltoides, trapézio, clavículas, escápulas
        ...[-1, 1].map(sd => por(bolha(.085 * k, .058 * k, .03 * k, { cor: tom(1.05), ruido: .1 }), [sd * .075 * k * w, .255 * k, .095 * k], [.15, sd * .25, sd * -.2])),
        ...[-1, 1].map(sd => por(bolha(.062 * k, .075 * k, .066 * k, { cor: tom(1), ruido: .1 }), [sd * .2 * k * w, .29 * k, 0], [0, 0, sd * .3])),
        ...[-1, 1].map(sd => tubo([[sd * .035 * k, .42 * k, -.03 * k], [sd * .11 * k * w, .37 * k, -.04 * k], [sd * .2 * k * w, .33 * k, -.01 * k]], [.045 * k, .045 * k, .035 * k], { nr: 8, nl: 8, cor: tom(.95) })),
        ...[-1, 1].map(sd => tubo([[sd * .02 * k, .36 * k, .075 * k], [sd * .1 * k * w, .37 * k, .06 * k], [sd * .19 * k * w, .345 * k, .02 * k]], [.012 * k, .011 * k, .012 * k], { nr: 5, nl: 6, cor: tom(1.2) })),
        ...[-1, 1].map(sd => por(bolha(.07 * k, .085 * k, .022 * k, { cor: tom(.9), ruido: .2 }), [sd * .095 * k * w, .25 * k, -.1 * k], [-.1, sd * -.35, 0])),
        ...Array.from({ length: 9 }, (_, i) => por(bolha(.018 * k, .016 * k, .014 * k, { ws: 8, hs: 6 }), [0, (-.03 + i * .045) * k, (-.085 - Math.sin(i / 8 * Math.PI) * .02) * k])),
      ]);
      malha(peito, tronco, mCarne);
      const nuc = K.nucleo(peito, .028 * k, [0, .19 * k, .125 * k], [-.1, 0, 0]);

      /* ---------- pescoço e cabeça ---------- */
      const pesc = junta(peito, 0, .38 * k, 0); pesc.rotation.x = .35;
      malha(pesc, juntar([
        tubo([[0, -.02 * k, -.01 * k], [0, .08 * k, .015 * k], [0, .15 * k, .03 * k]], [.056 * k, .046 * k, .05 * k], { nr: 10, nl: 8, cor: tom(.9) }),
        ...[-1, 1].map(sd => tubo([[sd * .045 * k, .15 * k, .01 * k], [sd * .035 * k, .07 * k, .045 * k], [sd * .012 * k, -.01 * k, .07 * k]], [.012 * k, .014 * k, .011 * k], { nr: 5, nl: 6, cor: tom(1.15) })),
      ]), mCarne);
      const cab = junta(pesc, 0, .15 * k, .035 * k); cab.rotation.x = -.35 - V.corcunda * .8; cab.rotation.z = V.inclina;
      const gauss = (x0, y0, z0, cx, cy, cz, sx, sy, a) => a * Math.exp(-(((x0 - cx) / sx) ** 2 + ((y0 - cy) / sy) ** 2 + ((z0 - cz) / sx) ** 2));
      const cranio = bolha(.094 * k, .126 * k, .11 * k, {
        ws: 30, hs: 24, ruido: .05, fq: 4,
        cor: q => { const n = fbm(q.x * 40, q.y * 40, q.z * 40), boca = Math.exp(-(((q.y + .05 * k) / (.025 * k)) ** 2)) * (q.z > .05 * k ? 1 : 0), olho = Math.max(...[-1, 1].map(sd => Math.exp(-(((q.x - sd * .034 * k) ** 2 + (q.y - .015 * k) ** 2) / (.018 * k) ** 2)))), v = (.5 + n * .5) * (1 - boca * .7) * (1 - olho * .75); return [v, v * .78, v * .78]; },
        def: (x0, y0, z0) => {
          let kk = 1;
          if (V.cranio === 1 && y0 > 0) { y0 *= 1.3; z0 -= y0 * .2; }
          if (V.cranio === 2) { x0 *= 1.1; kk += gauss(Math.abs(x0), y0, 0, 0, .75, 0, .16, .5, .12); }
          kk += [-1, 1].reduce((sum, sd) => sum + gauss(x0, y0, z0, sd * .38, .3, .9, .3, .1, .12) - gauss(x0, y0, z0, sd * .36, .13, .93, .17, .13, .2) - gauss(x0, y0, z0, sd * .7, -.25, .66, .28, .22, .14) + gauss(x0, y0, z0, sd * .62, -.02, .76, .2, .12, .06), 0);
          kk -= gauss(x0, y0, z0, 0, -.04, 1, .14, .1, .16) + gauss(x0, y0, z0, 0, -.42, .94, .5, .16, .3);
          if (y0 < -.15) { z0 += (-y0 - .15) * .38; x0 *= 1 - (-y0 - .15) * .3; }
          return [x0 * kk, y0 * kk, z0 * kk];
        },
      });
      const yC = .1 * k;
      cranio.translate(0, yC, 0);
      // orelhas pontudas de morcego, viradas para trás
      const orelhas = [-1, 1].map(sd => pintar(por(new K.T.ConeGeometry(.026 * k, .1 * k * V.orelha, 6), [sd * .1 * k, yC + .04 * k, -.015 * k], [-.9, sd * .3, -sd * 1.15], [1, 1, .3]), [.5, .35, .35]));
      // narinas cortadas
      const narinas = [-1, 1].map(sd => pintar(por(new K.T.SphereGeometry(.007 * k, 6, 5), [sd * .009 * k, yC - .006 * k, .108 * k], [0, 0, sd * .5], [1, 1.6, .6]), [.02, .01, .01]));
      malha(cab, juntar([cranio, ...orelhas, ...narinas]), mCarne);
      // boca: cavidade funda, gengiva sem lábios, dentes de cima fixos e mandíbula que abre
      malha(cab, bolha(.052 * k, .028 * k, .03 * k), mBoca, [0, yC - .05 * k, .066 * k]);
      const dente = (xx, yy, zz, comp, dy, dz) => por(new K.T.ConeGeometry(.0055 * k, comp, 4), [xx, yy + dy * comp / 2, zz], [dy > 0 ? -.15 : Math.PI + .15, 0, dz]);
      const dentesCima = [];
      for (let i = 0; i < 14; i++) { const a = (i / 13 - .5) * 2, l = (.014 + rng() * .014 + (i === 3 || i === 10 ? .016 : 0)) * k; dentesCima.push(dente(Math.sin(a) * .05 * k, yC - .033 * k, .05 * k + Math.cos(a) * .046 * k, l, -1, (rng() - .5) * .35)); }
      dentesCima.push(pintar(tubo(Array.from({ length: 7 }, (_, i) => { const a = (i / 6 - .5) * 2.1; return [Math.sin(a) * .052 * k, yC - .03 * k, .05 * k + Math.cos(a) * .047 * k]; }), [.007 * k], { nr: 5, nl: 14 }), [.55, .2, .2]));
      malha(cab, juntar(dentesCima), mOsso);
      const mand = junta(cab, 0, yC - .03 * k, 0);
      const dentesBaixo = [];
      for (let i = 0; i < 12; i++) { const a = (i / 11 - .5) * 1.9, l = (.012 + rng() * .014 + (i === 2 || i === 9 ? .012 : 0)) * k; dentesBaixo.push(dente(Math.sin(a) * .045 * k, -.036 * k, .048 * k + Math.cos(a) * .042 * k, l, 1, (rng() - .5) * .35)); }
      dentesBaixo.push(pintar(tubo(Array.from({ length: 7 }, (_, i) => { const a = (i / 6 - .5) * 2; return [Math.sin(a) * .047 * k, -.04 * k, .048 * k + Math.cos(a) * .043 * k]; }), [.008 * k], { nr: 5, nl: 14 }), [.5, .18, .18]));
      malha(mand, juntar(dentesBaixo), mOsso);
      // olhos fundos com brilho fraco
      [-1, 1].forEach(sd => malha(cab, new T.SphereGeometry(.0075 * k, 8, 6), mOlho, [sd * .034 * k, yC + .016 * k, .09 * k]));
      // língua comprida (só em alguns)
      const lingua = [];
      if (V.lingua) {
        let pai = junta(mand, 0, -.03 * k, .07 * k);
        for (let i = 0; i < 5; i++) { const l = .045 * k, r0 = (.011 - i * .0018) * k; malha(pai, tubo([[0, 0, 0], [0, -l * .3, l]], [r0, r0 * .85], { nr: 7, nl: 3, cor: [.9, .55, .55] }), mCarne); lingua.push(pai); pai = junta(pai, 0, -l * .3, l); }
      }

      /* ---------- braços longos, mãos de garras ---------- */
      const bracos = [-1, 1].map(sd => {
        const kb = k * V.braco;
        const ombro = junta(peito, sd * .205 * k * w, .29 * k, .02 * k); ombro.rotation.z = sd * .08;
        const veiaT = (pts, r0) => tubo(pts, [r0, r0 * .8], { nr: 4, nl: 10, cor: [.28, .12, .2], ini: -1, fim: -1 });
        malha(ombro, veiaT([[sd * .035 * kb, -.05 * kb, .035 * kb], [sd * .045 * kb, -.18 * kb, .04 * kb], [sd * .03 * kb, -.36 * kb, .032 * kb]], .0045 * kb), mCarne);
        malha(ombro, tubo([[0, .06 * kb, 0], [0, -.16 * kb, .01 * kb], [0, -.37 * kb, 0]], [[.05, .056], [.054, .062], [.042, .046], [.036, .04]].map(r => r.map(v => v * kb * w)), { nr: 10, nl: 10, deform: faixas(.006 * kb, 3), cor: tom(.95, .4), fim: .9 }), mCarne);
        const cotov = junta(ombro, 0, -.37 * kb, 0); cotov.rotation.x = -.18;
        malha(cotov, juntar([
          tubo([[0, .01 * kb, 0], [0, -.12 * kb, .012 * kb], [0, -.37 * kb, .01 * kb]], [[.046, .05], [.05, .052], [.034, .03], [.028, .022]].map(r => r.map(v => v * kb * w)), { nr: 10, nl: 10, deform: faixas(.005 * kb, 6), cor: tom(.7, .9), ini: 1, fim: .8 }),
          ...[0, 1, 2].map(i => tubo([[(i - 1) * .015 * kb, -.12 * kb, .035 * kb], [(i - 1) * .012 * kb, -.36 * kb, .022 * kb]], [.006 * kb, .004 * kb], { nr: 4, nl: 4, cor: [1.3, 1.1, 1] })),
        ]), mCarne);
        const pulso = junta(cotov, 0, -.37 * kb, .01 * kb);
        malha(pulso, tubo([[0, .005, 0], [0, -.045 * kb, .004 * kb], [0, -.09 * kb, .006 * kb]], [[.017, .028], [.018, .042], [.016, .04]].map(r => r.map(v => v * kb)), { nr: 8, nl: 6, cor: tom(.55) }), mCarne);
        const dedos = [];
        for (let i = 0; i < 5; i++) {
          const pol = i === 4, zz = pol ? .04 * kb : (i - 1.5) * .022 * kb, d = junta(pulso, 0, pol ? -.03 * kb : -.088 * kb, zz);
          const l = (pol ? .085 : .16 - Math.abs(i - 1.3) * .014) * kb, cc = -sd;
          const pts = pol ? [[0, 0, 0], [cc * .005, -.02 * kb, .025 * kb], [cc * .012, -.045 * kb, .05 * kb], [cc * .02, -.065 * kb, .062 * kb]] : [[0, 0, 0], [0, -l * .4, 0], [cc * l * .1, -l * .75, 0], [cc * l * .22, -l, 0]];
          const fim = pts[3], ant = pts[2], dir = [fim[0] - ant[0], fim[1] - ant[1], fim[2] - ant[2]], dl = Math.hypot(...dir);
          const unha = tubo([fim, [fim[0] + dir[0] / dl * .025 * kb + cc * .006 * kb, fim[1] + dir[1] / dl * .025 * kb, fim[2] + dir[2] / dl * .025 * kb], [fim[0] + dir[0] / dl * .055 * kb + cc * .028 * kb, fim[1] + dir[1] / dl * .055 * kb, fim[2] + dir[2] / dl * .055 * kb]], [.0085 * kb, .0055 * kb, .0006], { nr: 5, nl: 6, fim: 1.5, cor: [.06, .04, .04] });
          malha(d, juntar([tubo(pts, [.011 * kb, .0095 * kb, .008 * kb, .0075 * kb], { nr: 6, nl: 8, cor: tom(.5) }), unha]), mCarne);
          d.userData = { sd, pol }; dedos.push(d);
        }
        return { ombro, cotov, pulso, dedos, sd };
      });

      /* ---------- animação: respiração irregular, tiques, dedos, andar arrastado ---------- */
      const ra = K.rngDe(K.semente + 99), des = ra() * 10;
      let fase = ra() * 6, prox = .5, alvo = [0, 0, 0], cr = [0, 0, 0], ritmo = 0;
      const ap = (o, k2, v, vel, dt) => { o[k2] += (v - o[k2]) * Math.min(1, dt * vel); };
      const anim = (dt, t, andando) => {
        const tt = t + des;
        const resp = Math.sin(tt * 1.8 + Math.sin(tt * .43) * 2.4) * (.55 + .45 * Math.sin(tt * .29));
        peito.scale.set(1 + resp * .03, 1 + resp * .012, 1 + resp * .04);
        nuc.pulso(tt);
        // tique: a cabeça para e estala para outro lado
        prox -= dt; if (prox <= 0) { prox = .4 + ra() * 2.6; alvo = [(ra() - .5) * 1.1, (ra() - .5) * .5, (ra() - .3) * .4]; }
        for (let i = 0; i < 3; i++) cr[i] += (alvo[i] - cr[i]) * Math.min(1, dt * 16);
        cab.rotation.y = cr[0]; cab.rotation.z = V.inclina + cr[1] + Math.sin(tt * 23) * .015 * (prox > 2 ? 1 : 0);
        cab.rotation.x = -.35 - V.corcunda * .8 + cr[2] * .4;
        mand.rotation.x = .12 + Math.max(0, Math.sin(tt * .9)) * .25 + (Math.sin(tt * 13) > .8 ? .1 : 0);
        lingua.forEach((l, i) => { l.rotation.x = .25 + Math.sin(tt * 3 - i * .9) * .35; l.rotation.y = Math.sin(tt * 2.1 - i * .7) * .3; });
        ritmo += ((andando ? 1 : 0) - ritmo) * Math.min(1, dt * 4);
        if (andando) fase += dt * 3.3;
        const sn = Math.sin(fase), cs = Math.cos(fase), R = ritmo;
        pernas.forEach((p, i) => {
          const s2 = i ? -sn : sn, arrasto = i ? .45 : 1;
          ap(p.coxa.rotation, 'x', -s2 * .42 * R - .06, 10, dt);
          ap(p.joelho.rotation, 'x', (.12 + Math.max(0, Math.sin(fase + (i ? Math.PI : 0) + 1.3)) * .75 * arrasto) * R + .1 * (1 - R), 10, dt);
          ap(p.tornozelo.rotation, 'x', (s2 * .2 - .05) * R, 10, dt);
        });
        corpo.position.y = R * (Math.abs(cs) * .035 - .035) + (1 - R) * Math.sin(tt * .7) * .006;
        corpo.rotation.z = R * sn * .06 + (1 - R) * Math.sin(tt * .45) * .02;
        quadril.rotation.y = R * sn * .1;
        peito.rotation.y = -R * sn * .14; peito.rotation.x = V.corcunda + R * .06 + Math.sin(tt * .5) * .015;
        bracos.forEach((b, i) => {
          const s2 = i ? sn : -sn;
          ap(b.ombro.rotation, 'x', R * s2 * .38 + (1 - R) * Math.sin(tt * .8 + i) * .05, 6, dt);
          ap(b.ombro.rotation, 'z', b.sd * (.08 + Math.sin(tt * .6 + i * 2) * .02), 6, dt);
          ap(b.cotov.rotation, 'x', -.2 - R * Math.max(0, -s2) * .3, 6, dt);
          b.pulso.rotation.x = Math.sin(tt * 1.3 + i) * .08;
          b.dedos.forEach((d, j) => { const curl = .15 + .3 * (.5 + .5 * Math.sin(tt * 2.2 + j * .8 + i * 2)) + (Math.sin(tt * 9 + j) > .95 ? .4 : 0); d.rotation.z = -b.sd * curl; d.rotation.x = d.userData.pol ? .3 : 0; });
        });
      };
      anim(0, 0, false); const caixa = new T.Box3().setFromObject(g);
      return { g, alt: +caixa.max.y.toFixed(2), raioBase: .42, anim };
    },
  };
})();

/* ===== forma: fera_pelo ===== */
(() => {
  const NS = window.ACF3D = window.ACF3D || {};
  /* ===== kit de modelagem orgânica (igual em todas as formas, para cada arquivo funcionar sozinho) ===== */
  function kit(F, s) {
    const T = F.T;
    const L = c => new T.Color(c).convertSRGBToLinear();
    // semente a partir do id do ser: vários iguais na mesma sala saem diferentes
    let h = 2166136261; String((s && s.id) || 'x').split('').forEach(ch => { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); });
    const semente = (h >>> 0) % 99991;
    const rngDe = n => { let a = (n * 2654435761) >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
    const rng = rngDe(semente + 7);
    const tela = (w, hh) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; return [c, c.getContext('2d')]; };
    // material PBR guardado (cores escritas como aparecem na tela)
    const mat = (o = {}) => {
      const p = { color: L(o.cor || '#ffffff'), roughness: o.r ?? .7, metalness: o.me ?? 0 };
      if (o.e) { p.emissive = L(o.e); p.emissiveIntensity = o.ei ?? 1; }
      if (o.mapa) p.map = o.mapa; if (o.bump) { p.bumpMap = o.bump; p.bumpScale = o.bs ?? 1; }
      if (o.rMapa) p.roughnessMap = o.rMapa; if (o.emiMapa) p.emissiveMap = o.emiMapa;
      if (o.vc) p.vertexColors = true; if (o.lado) p.side = T.DoubleSide;
      if (o.alfa) p.alphaTest = o.alfa;
      if (o.op !== undefined) { p.transparent = true; p.opacity = o.op; p.depthWrite = false; }
      const m = F.guardar(new T.MeshStandardMaterial(p));
      if (o.flat) m.flatShading = true;
      return m;
    };
    const tex = (c, rep) => F.texCanvas(c, rep || [1, 1]);
    // ruído de valor 3D e fbm (0 a ~0,9)
    const hs = (x, y, z) => { const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + semente * .0131) * 43758.5453; return v - Math.floor(v); };
    const hf = (x, y, z) => { const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return v - Math.floor(v); };
    const sm = t => t * t * (3 - 2 * t);
    const lerp = (a, b, t) => a + (b - a) * t;
    function ruido(x, y, z) {
      const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = sm(x - ix), fy = sm(y - iy), fz = sm(z - iz);
      const a = (i, j, k) => hs(ix + i, iy + j, iz + k);
      return lerp(lerp(lerp(a(0, 0, 0), a(1, 0, 0), fx), lerp(a(0, 1, 0), a(1, 1, 0), fx), fy), lerp(lerp(a(0, 0, 1), a(1, 0, 1), fx), lerp(a(0, 1, 1), a(1, 1, 1), fx), fy), fz);
    }
    const fbm = (x, y, z, n = 3) => { let r = 0, a = .5, f = 1; for (let i = 0; i < n; i++) { r += a * ruido(x * f + i * 17, y * f, z * f); a *= .5; f *= 2.03; } return r; };
    // células (placas): distância à 1ª e à 2ª semente e um id por placa
    function celula(x, y, z) {
      const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z); let f1 = 9, f2 = 9, id = 0;
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
        const cx = ix + i, cy = iy + j, cz = iz + k;
        const dx = cx + hf(cx, cy, cz) - x, dy = cy + hf(cy + 3.1, cz, cx) - y, dz = cz + hf(cz - 7.7, cx, cy) - z, d = dx * dx + dy * dy + dz * dz;
        if (d < f1) { f2 = f1; f1 = d; id = hf(cx * 1.7, cy * 2.3, cz * 3.1); } else if (d < f2) f2 = d;
      }
      return [Math.sqrt(f1), Math.sqrt(f2), id];
    }
    // normais suaves sem costura (vértices na mesma posição dividem a normal)
    function suavizar(geo) {
      geo.computeVertexNormals();
      const p = geo.attributes.position, n = geo.attributes.normal, mapa = new Map();
      for (let i = 0; i < p.count; i++) { const k = p.getX(i).toFixed(4) + ',' + p.getY(i).toFixed(4) + ',' + p.getZ(i).toFixed(4); let a = mapa.get(k); if (!a) { a = []; mapa.set(k, a); } a.push(i); }
      mapa.forEach(a => { if (a.length < 2) return; let x = 0, y = 0, z = 0; a.forEach(i => { x += n.getX(i); y += n.getY(i); z += n.getZ(i); }); const l = Math.hypot(x, y, z) || 1; a.forEach(i => n.setXYZ(i, x / l, y / l, z / l)); });
      return geo;
    }
    // cor por vértice (função da posição) para poder juntar e sombrear regiões
    function pintar(geo, fn) {
      const p = geo.attributes.position, c = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const v = typeof fn === 'function' ? fn(p.getX(i), p.getY(i), p.getZ(i)) : fn; c[i * 3] = v[0]; c[i * 3 + 1] = v[1]; c[i * 3 + 2] = v[2]; }
      geo.setAttribute('color', new T.BufferAttribute(c, 3)); return geo;
    }
    const BRANCO = [1, 1, 1];
    // junta várias geometrias indexadas em uma (menos chamadas de desenho)
    function juntar(geos) {
      geos = geos.filter(Boolean).map(g => { if (!g.index) { const n = g.attributes.position.count, ix = []; for (let i = 0; i < n; i++) ix.push(i); g.setIndex(ix); } if (!g.attributes.color) pintar(g, BRANCO); if (!g.attributes.uv) g.setAttribute('uv', new T.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); if (!g.attributes.normal) g.computeVertexNormals(); return g; });
      let nv = 0, ni = 0; geos.forEach(g => { nv += g.attributes.position.count; ni += g.index.count; });
      const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), C = new Float32Array(nv * 3), I = new (nv > 65535 ? Uint32Array : Uint16Array)(ni);
      let ov = 0, oi = 0;
      geos.forEach(g => { const c = g.attributes.position.count; P.set(g.attributes.position.array, ov * 3); N.set(g.attributes.normal.array, ov * 3); U.set(g.attributes.uv.array, ov * 2); C.set(g.attributes.color.array, ov * 3); const ix = g.index.array; for (let i = 0; i < ix.length; i++) I[oi + i] = ix[i] + ov; ov += c; oi += ix.length; g.dispose(); });
      const r = new T.BufferGeometry(); r.setAttribute('position', new T.BufferAttribute(P, 3)); r.setAttribute('normal', new T.BufferAttribute(N, 3)); r.setAttribute('uv', new T.BufferAttribute(U, 2)); r.setAttribute('color', new T.BufferAttribute(C, 3)); r.setIndex(new T.BufferAttribute(I, 1));
      return r;
    }
    // aplica posição/rotação/escala numa geometria (para juntar peças já no lugar)
    const _o = new T.Object3D();
    function por(geo, pos = [0, 0, 0], rot = [0, 0, 0], esc = [1, 1, 1]) { _o.position.set(...pos); _o.rotation.set(...rot); _o.scale.set(...(Array.isArray(esc) ? esc : [esc, esc, esc])); _o.updateMatrix(); geo.applyMatrix4(_o.matrix); return geo; }
    function malha(pai, geo, m, pos, rot) { const me = new T.Mesh(F.guardar(geo), m); if (pos) me.position.set(...pos); if (rot) me.rotation.set(...rot); pai.add(me); return me; }
    function junta(pai, x = 0, y = 0, z = 0) { const j = new T.Group(); j.position.set(x, y, z); pai.add(j); return j; }

    /* tubo orgânico que passa pelos pontos pts ([x,y,z]); raios: números ou [largura, profundidade] ao longo.
       o: { nr, nl, ref, ruido, fq, deform(q, dir, t, a) → deslocamento, cor(q, t, a) → [r,g,b] ou cor fixa,
       ini, fim (pontas arredondadas: fração do raio; negativo = sem tampa), uvV (repetição ao longo) } */
    function tubo(pts, raios, o = {}) {
      const nr = o.nr || 10, nl = o.nl || Math.max(6, pts.length * 4);
      const V = pts.map(p => new T.Vector3(p[0], p[1], p[2]));
      const curva = V.length === 2 ? new T.LineCurve3(V[0], V[1]) : new T.CatmullRomCurve3(V, false, 'centripetal');
      const ref = new T.Vector3(...(o.ref || [0, 0, 1]));
      const RR = raios.map(r => Array.isArray(r) ? r : [r, r]);
      const R = t => { if (RR.length === 1) return RR[0]; const k = t * (RR.length - 1), i = Math.min(RR.length - 2, Math.floor(k)), f = sm(k - i); return [lerp(RR[i][0], RR[i + 1][0], f), lerp(RR[i][1], RR[i + 1][1], f)]; };
      const pos = [], uv = [], idx = [], col = [];
      const P = new T.Vector3(), Tg = new T.Vector3(), Lx = new T.Vector3(), Lz = new T.Vector3(), q = new T.Vector3(), dir = new T.Vector3();
      const fq = o.fq || 9, aneis = [];
      const corF = !o.cor ? null : typeof o.cor === 'function' ? o.cor : () => o.cor;
      for (let i = 0; i <= nl; i++) {
        const t = i / nl; curva.getPointAt(t, P); curva.getTangentAt(t, Tg);
        Lx.crossVectors(Tg, ref); if (Lx.lengthSq() < 1e-8) Lx.set(1, 0, 0); Lx.normalize(); Lz.crossVectors(Lx, Tg).normalize();
        const [rx, rz] = R(t); aneis.push([P.clone(), Tg.clone(), Math.max(rx, rz)]);
        for (let j = 0; j <= nr; j++) {
          const a = (j / nr - .5) * Math.PI * 2, sa = Math.sin(a), ca = Math.cos(a);
          q.copy(P).addScaledVector(Lx, sa * rx).addScaledVector(Lz, ca * rz);
          dir.copy(Lx).multiplyScalar(sa * rz).addScaledVector(Lz, ca * rx).normalize();
          let d = 0;
          if (o.ruido) d += (fbm(q.x * fq + 3, q.y * fq, q.z * fq) - .44) * o.ruido;
          if (o.deform) d += o.deform(q, dir, t, a) || 0;
          q.addScaledVector(dir, d);
          pos.push(q.x, q.y, q.z); uv.push(j / nr, t * (o.uvV || 1));
          const c = corF ? corF(q, t, a) : BRANCO; col.push(c[0], c[1], c[2]);
        }
      }
      const W = nr + 1;
      for (let i = 0; i < nl; i++) for (let j = 0; j < nr; j++) { const a = i * W + j, b = a + W; idx.push(a, a + 1, b, b, a + 1, b + 1); }
      // tampas arredondadas (polo empurrado para fora)
      const tampa = (anel, k, sinal) => {
        if (k < 0) return; const [Pc, Tc, r] = aneis[anel]; const pp = Pc.clone().addScaledVector(Tc, sinal * r * k);
        const c = corF ? corF(pp, anel ? 1 : 0, 0) : BRANCO; const iv = pos.length / 3; pos.push(pp.x, pp.y, pp.z); uv.push(.5, anel ? (o.uvV || 1) : 0); col.push(c[0], c[1], c[2]);
        for (let j = 0; j < nr; j++) { const a = anel * W + j; if (sinal > 0) idx.push(a, a + 1, iv); else idx.push(a + 1, a, iv); }
      };
      tampa(0, o.ini ?? .5, -1); tampa(nl, o.fim ?? .5, 1);
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx);
      return suavizar(g);
    }
    // elipsoide deformado: def(x,y,z na esfera unitária) → [x,y,z]; ruído opcional
    function bolha(rx, ry, rz, o = {}) {
      const g = new T.SphereGeometry(1, o.ws || 20, o.hs || 14), p = g.attributes.position, fq = o.fq || 3;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        if (o.def) [x, y, z] = o.def(x, y, z);
        let k = 1; if (o.ruido) k += (fbm(x * fq + 5, y * fq, z * fq) - .44) * o.ruido;
        p.setXYZ(i, x * rx * k, y * ry * k, z * rz * k);
      }
      if (o.cor) pintar(g, typeof o.cor === 'function' ? (x, y, z) => o.cor({ x, y, z }) : o.cor); return suavizar(g);
    }
    // cones (dentes, garras, espinhos) juntos: lista de [pos, dir, comp, raio]
    function espinhos(lista, o = {}) {
      const geos = lista.map(([p, d, comp, r]) => { const g = new T.ConeGeometry(r, comp, o.lados || 5, 1); g.translate(0, comp / 2, 0); const v = new T.Vector3(...d).normalize(); g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), v)); g.translate(...p); pintar(g, o.c || BRANCO); return g; });
      return juntar(geos);
    }
    /* núcleo roxo no peito: esfera brilhante numa moldura escura de espinhos (como aranha) */
    function nucleo(pai, r, pos, rot, o = {}) {
      const g = junta(pai, ...pos); if (rot) g.rotation.set(...rot);
      const mN = mat({ cor: '#2a0844', e: '#8f2bff', ei: 1.4, r: .15, me: .1 });
      const esf = malha(g, new T.SphereGeometry(r, 20, 14), mN, [0, 0, r * .25]);
      const brilho = F.guardar(new T.MeshBasicMaterial({ color: L('#7a20ff'), transparent: true, opacity: .28, blending: T.AdditiveBlending, depthWrite: false }));
      const halo = malha(g, new T.SphereGeometry(r * 1.9, 16, 12), brilho, [0, 0, r * .4]);
      const mM = mat({ cor: '#140a10', r: .35, me: .45 });
      const pecas = [por(new T.TorusGeometry(r * 1.18, r * .2, 6, 24), [0, 0, r * .1])];
      const n = o.pernas || 8;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + .2, ca = Math.cos(a), sa = Math.sin(a), R1 = r * 1.2, R2 = r * (2.1 + (i % 2) * .5), R3 = r * (2.9 + (i % 3) * .4);
        pecas.push(tubo([[ca * R1, sa * R1, r * .15], [ca * R2, sa * R2, r * .55], [ca * R3, sa * R3, -r * .1]], [r * .13, r * .1, r * .02], { nr: 5, nl: 6, fim: 1.5 }));
      }
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; pecas.push(por(new T.ConeGeometry(r * .1, r * .55, 4), [Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3, r * .35], [0, 0, a - Math.PI / 2])); }
      malha(g, juntar(pecas), mM);
      const pulso = (t, extra = 0) => { const k = .5 + .5 * Math.sin(t * 1.3) * Math.sin(t * .37 + 1); mN.emissiveIntensity = .9 + k * 1.3 + extra; brilho.opacity = .1 + k * .2; halo.scale.setScalar(.85 + k * .35); };
      return { g, pulso, mat: mN };
    }
    return { T, L, mat, tex, tela, rng, rngDe, semente, ruido, fbm, celula, hs, hf, sm, lerp, suavizar, pintar, juntar, por, malha, junta, tubo, bolha, espinhos, nucleo };
  }
  /* Fera curvada de pelo branco-acinzentado empapado de sangue, costelas vermelhas expostas, chifres ao longo dos
     ombros, bocarra que se abre na vertical cheia de dentes, um olho vermelho aceso, braços longos de garras,
     pernas dobradas para trás e cauda. Parada, parece inquieta: fareja e sacode a cabeça. */
  (NS.formasFilho = NS.formasFilho || {}).fera_pelo = {
    nome: 'Fera de pelo (bocarra vertical)',
    criar: (F, s) => {
      const K = kit(F, s), { T, L, mat, tubo, bolha, malha, junta, juntar, por, pintar, fbm, sm } = K;
      const g = new T.Group(), r2 = K.rngDe(919);

      /* ---------- texturas: mecha de pelo (recorte por alfa), pele por baixo, carne e osso ---------- */
      const [cp, xp] = K.tela(256, 256); xp.clearRect(0, 0, 256, 256);
      for (let i = 0; i < 34; i++) {
        const x0 = 10 + r2() * 236, topo = 4 + r2() * 90, curva = (r2() - .5) * 50, w0 = 2.2 + r2() * 2.6;
        for (let k = 0; k < 3; k++) { const v = 150 + r2() * 105; xp.strokeStyle = `rgb(${v},${v - 4},${v - 10})`; xp.lineWidth = w0 * (1 - k * .3); xp.lineCap = 'round'; xp.beginPath(); xp.moveTo(x0 + k * 1.5, 256); xp.quadraticCurveTo(x0 + curva * .3, (256 + topo) / 2, x0 + curva, topo + k * 18); xp.stroke(); }
      }
      const gr = xp.createLinearGradient(0, 256, 0, 0); gr.addColorStop(0, 'rgba(40,30,25,.55)'); gr.addColorStop(.45, 'rgba(40,30,25,0)'); xp.globalCompositeOperation = 'source-atop'; xp.fillStyle = gr; xp.fillRect(0, 0, 256, 256); xp.globalCompositeOperation = 'source-over';
      const tPelo = K.tex(cp);
      const mPelo = mat({ mapa: tPelo, alfa: .45, lado: true, vc: true, r: .88 });
      const [cs, xs] = K.tela(256, 256); xs.fillStyle = '#857c72'; xs.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i++) { const v = 90 + r2() * 120; xs.strokeStyle = `rgba(${v},${v - 6},${v - 12},.5)`; xs.lineWidth = 1 + r2() * 2; const x0 = r2() * 256, y0 = r2() * 256; xs.beginPath(); xs.moveTo(x0, y0); xs.lineTo(x0 + (r2() - .5) * 6, y0 + 10 + r2() * 20); xs.stroke(); }
      const tPele = K.tex(cs, [2, 2]);
      const mPele = mat({ mapa: tPele, r: .9, vc: true });
      const [cc, xc] = K.tela(256, 256); xc.fillStyle = '#5a0c0a'; xc.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 300; i++) { xc.strokeStyle = ['#8a1a14', '#3a0505', '#a8302a'][Math.floor(r2() * 3)]; xc.globalAlpha = .3 + r2() * .4; xc.lineWidth = 1 + r2() * 3; const x0 = r2() * 256, y0 = r2() * 256; xc.beginPath(); xc.moveTo(x0, y0); xc.quadraticCurveTo(x0 + 10, y0 + 20, x0 + (r2() - .5) * 20, y0 + 40); xc.stroke(); } xc.globalAlpha = 1;
      const tCarne = K.tex(cc, [2, 2]);
      const mCarne = mat({ mapa: tCarne, bump: tCarne, bs: .2, r: .3, vc: true });
      const mOsso = mat({ cor: '#d8c4a8', r: .4, vc: true });
      const mCostela = mat({ cor: '#7a3028', r: .28, vc: true });
      const mGarra = mat({ cor: '#140c0a', r: .25, me: .1 });
      const mDente = mat({ cor: '#e2d6bc', r: .3 });
      const mOlho = mat({ cor: '#3a0000', e: '#ff1208', ei: 3.2, r: .1 });
      const mOlhoMorto = mat({ cor: '#2a0a08', e: '#801008', ei: .5, r: .1 });
      const mSangue = mat({ cor: '#4a0204', r: .15, me: .05 });

      /* ---------- pelo: cartões presos na superfície de cada peça (mexem junto com a junta) ---------- */
      const BRANCO_P = L('#e4e0d8'), CINZA_P = L('#a39c92'), SANGUE_P = L('#6a0c08'), SANGUE_E = L('#360403');
      const corPelo = (sangue = 0, escuro = 0) => (b) => {
        const n = fbm(b.x * 6 + 3, b.y * 6, b.z * 6), base = n > .5 ? BRANCO_P : CINZA_P, m = n > .5 ? (n - .5) * 2 : 1 - n * 2;
        let r = base.r * (.85 + m * .3), gg = base.g * (.85 + m * .3), bb = base.b * (.85 + m * .3);
        const sg = Math.max(0, Math.min(1, sangue + (fbm(b.x * 9, b.y * 9 + 5, b.z * 9) - .45) * 1.4)), cs2 = sg > .7 ? SANGUE_E : SANGUE_P;
        r = r * (1 - sg) + cs2.r * sg; gg = gg * (1 - sg) + cs2.g * sg; bb = bb * (1 - sg) + cs2.b * sg;
        const e = 1 - escuro; return [r * e, gg * e, bb * e];
      };
      function pelo(geo, n, o = {}) {
        const p = geo.attributes.position, nm = geo.attributes.normal, ix = geo.index.array, areas = [], tri = ix.length / 3;
        const A = new T.Vector3(), B = new T.Vector3(), C = new T.Vector3(), N0 = new T.Vector3(), base = new T.Vector3(), nrm = new T.Vector3(), dir = new T.Vector3(), lado = new T.Vector3();
        let tot = 0; for (let i = 0; i < tri; i++) { A.fromBufferAttribute(p, ix[i * 3]); B.fromBufferAttribute(p, ix[i * 3 + 1]); C.fromBufferAttribute(p, ix[i * 3 + 2]); tot += B.sub(A).cross(C.sub(A)).length() / 2; areas.push(tot); }
        const fluxo = new T.Vector3(...(o.fluxo || [0, -1, 0])).normalize();
        const pos = [], uv = [], col = [], idx = [];
        for (let k = 0; k < n; k++) {
          const alvo = r2() * tot; let lo = 0, hi = tri - 1; while (lo < hi) { const md = (lo + hi) >> 1; if (areas[md] < alvo) lo = md + 1; else hi = md; }
          let u = r2(), v = r2(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
          const [i0, i1, i2] = [ix[lo * 3], ix[lo * 3 + 1], ix[lo * 3 + 2]];
          A.fromBufferAttribute(p, i0); B.fromBufferAttribute(p, i1); C.fromBufferAttribute(p, i2); base.copy(A).multiplyScalar(1 - u - v).addScaledVector(B, u).addScaledVector(C, v);
          N0.fromBufferAttribute(nm, i0).multiplyScalar(1 - u - v); nrm.fromBufferAttribute(nm, i1).multiplyScalar(u); N0.add(nrm); nrm.fromBufferAttribute(nm, i2).multiplyScalar(v); nrm.add(N0).normalize();
          if (o.filtro && !o.filtro(base, nrm)) continue;
          const len = (o.len || .1) * (.6 + r2() * .9) * 1.15, wid = (o.wid || .05) * (.5 + r2() * .4);
          dir.copy(nrm).multiplyScalar(o.levanta ?? .45).addScaledVector(fluxo, 1).add(new T.Vector3((r2() - .5) * .5, (r2() - .5) * .5, (r2() - .5) * .5)).normalize();
          lado.crossVectors(dir, nrm); if (lado.lengthSq() < 1e-6) lado.set(1, 0, 0); lado.normalize();
          const raiz = base.clone().addScaledVector(nrm, -.004), ponta = base.clone().addScaledVector(dir, len);
          const iv = pos.length / 3;
          pos.push(raiz.x - lado.x * wid / 2, raiz.y - lado.y * wid / 2, raiz.z - lado.z * wid / 2, raiz.x + lado.x * wid / 2, raiz.y + lado.y * wid / 2, raiz.z + lado.z * wid / 2, ponta.x - lado.x * wid * .3, ponta.y - lado.y * wid * .3, ponta.z - lado.z * wid * .3, ponta.x + lado.x * wid * .3, ponta.y + lado.y * wid * .3, ponta.z + lado.z * wid * .3);
          uv.push(0, 0, 1, 0, 0, 1, 1, 1);
          const c = (o.cor || corPelo())(base); for (let j = 0; j < 4; j++) col.push(c[0] * (j < 2 ? .7 : 1), c[1] * (j < 2 ? .7 : 1), c[2] * (j < 2 ? .7 : 1));
          idx.push(iv, iv + 1, iv + 2, iv + 1, iv + 3, iv + 2);
          // normal do cartão = normal da pele (luz suave, como pelo)
          for (let j = 0; j < 4; j++) { /* preenchido abaixo */ }
        }
        const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); gg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); gg.setAttribute('color', new T.Float32BufferAttribute(col, 3)); gg.setIndex(idx);
        gg.computeVertexNormals(); return gg;
      }
      // peça peluda: pele por baixo + cartões de pelo
      const peca = (pai, geo, nPelo, oPelo, mBase = mPele) => { const pg = pelo(geo, Math.round(nPelo * 1.5), oPelo); malha(pai, geo, mBase); if (pg.attributes.position.count) malha(pai, pg, mPelo); };
      const tomPele = (escuro = 0) => q => { const v = (.75 + fbm(q.x * 8, q.y * 8, q.z * 8) * .4) * (1 - escuro); return [v, v * .97, v * .94]; };

      const corpo = junta(g, 0, 0, 0);
      const quadril = junta(corpo, 0, 1.12, 0);
      peca(quadril, tubo([[0, -.14, -.1], [0, .04, 0], [0, .2, .06]], [[.2, .18], [.23, .2], [.25, .22]], { nr: 16, nl: 10, cor: tomPele(), ruido: .02 }), 260, { len: .13, wid: .06, fluxo: [0, -1, -.4], cor: b => corPelo(.2 + Math.max(0, b.z) * 2)(b) });

      /* ---------- pernas dobradas para trás (pisa nos dedos) ---------- */
      const pernas = [-1, 1].map(sd => {
        const coxa = junta(quadril, sd * .19, -.04, 0); coxa.rotation.z = sd * .14;
        peca(coxa, tubo([[0, .1, -.03], [0, -.18, .1], [0, -.42, .2]], [[.15, .16], [.14, .15], [.1, .1], [.075, .075]], { nr: 14, nl: 12, cor: tomPele(), ruido: .02 }), 260, { len: .12, wid: .06, fluxo: [0, -1, .2], cor: b => corPelo(.05 + Math.max(0, b.z - .05) * 2)(b) });
        const joelho = junta(coxa, 0, -.42, .2);
        peca(joelho, tubo([[0, .04, .01], [0, -.2, -.1], [0, -.4, -.2]], [.075, .062, .048], { nr: 12, nl: 10, cor: tomPele(.1) }), 140, { len: .09, wid: .05, fluxo: [0, -1, -.3], cor: b => corPelo(.3 - b.y * .8, .1)(b) });
        const jarrete = junta(joelho, 0, -.4, -.2);
        peca(jarrete, tubo([[0, .03, -.01], [0, -.15, .04], [0, -.28, .1]], [.048, .042, .036], { nr: 10, nl: 8, cor: tomPele(.3) }), 70, { len: .07, wid: .04, fluxo: [0, -1, .3], cor: corPelo(.5, .25) });
        const pe = junta(jarrete, 0, -.28, .1);
        const dedos = [];
        for (let i = 0; i < 3; i++) { const xx = (i - 1) * .04, l = .13 - Math.abs(i - 1) * .025; dedos.push(tubo([[xx, .01, -.02], [xx * 1.3, -.01, l * .6], [xx * 1.5, -.025, l]], [.026, .022, .016], { nr: 8, nl: 6, cor: [.35, .3, .28], fim: .5 })); }
        malha(pe, juntar(dedos), mPele);
        malha(pe, juntar([0, 1, 2].map(i => { const xx = (i - 1) * .04, l = .13 - Math.abs(i - 1) * .025; return tubo([[xx * 1.5, -.02, l - .01], [xx * 1.6, -.02, l + .04], [xx * 1.65, -.05, l + .07]], [.012, .008, .001], { nr: 5, nl: 5, fim: 1.2 }); })), mGarra);
        return { coxa, joelho, jarrete, pe, sd };
      });

      /* ---------- cauda (cadeia de juntas, chicoteia) ---------- */
      const cauda = []; { let pai = junta(quadril, 0, -.05, -.18); pai.rotation.x = 2.3;
        for (let i = 0; i < 6; i++) { const l = .19, r0 = .07 - i * .009, r1 = r0 - .009; peca(pai, tubo([[0, .02, 0], [0, -l, 0]], [r0, r1], { nr: 10, nl: 4, cor: tomPele(.1), ini: .6, fim: .6 }), i === 5 ? 120 : 50, { len: i === 5 ? .2 : .08, wid: i === 5 ? .07 : .045, fluxo: [0, -1, 0], levanta: .3, cor: corPelo(i > 3 ? .45 : .15, .1) }); cauda.push(pai); pai = junta(pai, 0, -l, 0); } }

      /* ---------- tronco curvado: peito aberto com costelas e o núcleo lá dentro ---------- */
      const peito = junta(quadril, 0, .17, .04); peito.rotation.x = .78;
      const cav = (t, a) => Math.cos(a) > .25 && t > .14 && t < .8 ? sm(Math.min(1, (Math.cos(a) - .25) / .3)) * Math.sin((t - .14) / .66 * Math.PI) : 0;
      const tronco = tubo([[0, -.05, 0], [0, .25, .04], [0, .5, .03], [0, .72, -.05]], [[.22, .2], [.27, .24], [.32, .26], [.3, .21]], { nr: 22, nl: 18, ruido: .02, deform: (q, d, t, a) => -.08 * cav(t, a), cor: (q, t, a) => cav(t, a) > .2 ? [.22, .05, .05] : tomPele()(q) });
      malha(peito, tronco, mPele);
      // pelo só fora da cavidade do peito
      const pPeito = pelo(tronco, 1300, { len: .16, wid: .07, fluxo: [0, -.6, -1], levanta: .5, filtro: (b, nn) => !(nn.z > .45 && b.y > .05 && b.y < .6), cor: b => corPelo(.15 + Math.max(0, b.z) * 2.2 - Math.max(0, b.y - .6) * 1.5)(b) });
      malha(peito, pPeito, mPelo);
      // juba longa no pescoço e na corcova
      peca(peito, por(bolha(.28, .16, .2, { ws: 16, hs: 10, cor: tomPele(), ruido: .2 }), [0, .66, -.08]), 420, { len: .24, wid: .08, fluxo: [0, -.4, -1], levanta: .7, cor: corPelo(.1) });
      // cavidade: carne molhada, costelas vermelhas, o núcleo roxo e uma luz fraca lá dentro
      malha(peito, por(bolha(.2, .27, .12, { ws: 18, hs: 14, ruido: .3, fq: 5, cor: q => { const v = .6 + fbm(q.x * 12, q.y * 12, q.z * 12) * .7; return [v, v * .6, v * .6]; } }), [0, .36, .07]), mCarne);
      const costelas = [];
      for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) {
        const y = .15 + i * .078 + (r2() - .5) * .02, rx = .24 + Math.sin(i / 5 * Math.PI) * .05, rz = .23 + Math.sin(i / 5 * Math.PI) * .03, quebrada = r2() < .25, fimA = quebrada ? .55 + r2() * .3 : .12, pts = [];
        for (let j = 0; j <= 6; j++) { const a = sx * (1.2 - j / 6 * (1.2 - fimA)); pts.push([Math.sin(a) * rx * (1 + .03 * Math.sin(j * 2 + i)), y + (1 - j / 6) * .06 - j * .012, Math.cos(a) * rz + .02]); }
        costelas.push(tubo(pts, [.012, .014, .011, quebrada ? .005 : .008], { nr: 6, nl: 12, cor: q => { const v = .45 + fbm(q.x * 20, q.y * 20, 0) * .5; return [v, v * .38, v * .34]; }, fim: quebrada ? .2 : .6, ini: .8 }));
      }
      costelas.push(tubo([[0, .12, .225], [0, .3, .25], [0, .55, .235]], [.016, .02, .015], { nr: 6, nl: 10, cor: [.5, .22, .2] }));
      malha(peito, juntar(costelas), mCostela);
      const nuc = K.nucleo(peito, .055, [0, .37, .2], [0, 0, 0], { pernas: 8 });
      const luz = new T.PointLight(L('#9a3cff'), .6, .65, 2); luz.position.set(0, .37, .24); peito.add(luz);
      // sangue escorrendo das costelas
      malha(peito, juntar(Array.from({ length: 7 }, () => { const xx = (r2() - .5) * .4, y0 = .15 + r2() * .35, l = .05 + r2() * .12; return tubo([[xx, y0, .24], [xx, y0 - l * .6, .245], [xx + (r2() - .5) * .01, y0 - l, .24]], [.006, .005, .009], { nr: 5, nl: 5, fim: 1 }); })), mSangue);

      /* ---------- chifres ao longo dos ombros ---------- */
      const chifres = [];
      [-1, 1].forEach(sd => { for (let i = 0; i < 3; i++) { const t = i / 2, b = [sd * (.12 + t * .19), .7 - t * .13, -.06 + t * .03], l = [.36, .46, .3][i] * (.9 + r2() * .2), d = [sd * (.3 + t * .55), .75 - t * .35, -.5]; const dl = Math.hypot(...d), dn = d.map(v => v / dl); chifres.push(tubo([b, [b[0] + dn[0] * l * .45, b[1] + dn[1] * l * .45, b[2] + dn[2] * l * .45], [b[0] + dn[0] * l * .8 + sd * .02, b[1] + dn[1] * l * .8 + .07, b[2] + dn[2] * l * .8 - .02], [b[0] + dn[0] * l + sd * .01, b[1] + dn[1] * l + .14, b[2] + dn[2] * l + .03]], [.045 - i * .004, .032, .016, .002], { nr: 8, nl: 12, fim: 1.5, cor: (q, tt) => { const k = sm(Math.min(1, tt / .45)); return [.45 + k * .55, .12 + k * .78, .1 + k * .7]; } })); } });
      malha(peito, juntar(chifres), mOsso);

      /* ---------- pescoço e cabeça: bocarra vertical, um olho aceso ---------- */
      const pesc = junta(peito, 0, .7, .04); pesc.rotation.x = -.55;
      peca(pesc, tubo([[0, -.04, -.02], [0, .12, .03], [0, .25, .05]], [.15, .12, .11], { nr: 12, nl: 8, cor: tomPele() }), 260, { len: .2, wid: .07, fluxo: [0, -1, .15], levanta: .8, cor: b => corPelo(.2 + Math.max(0, b.z) * 3)(b) });
      const cab = junta(pesc, 0, .26, .05); cab.rotation.x = -.2;
      peca(cab, bolha(.1, .11, .13, { ws: 18, hs: 14, cor: tomPele(.05), def: (x0, y0, z0) => [x0 * (1 - Math.max(0, z0) * .25), y0, z0] }), 220, { len: .1, wid: .05, fluxo: [0, -.2, -1], levanta: .6, cor: corPelo(.2), filtro: (b, nn) => nn.z < .5 });
      malha(cab, bolha(.075, .07, .06, { ws: 14, hs: 10 }), mat({ cor: '#200404', r: .3 }), [0, 0, .08]);
      const mandibula = (sinal) => {
        const j = junta(cab, 0, sinal * .03, .07);
        const L0 = .3, pts = [[0, 0, 0], [0, sinal * .012, L0 * .5], [0, sinal * .03, L0]];
        peca(j, tubo(pts, [[.085, .05], [.065, .04], [.025, .02]], { nr: 14, nl: 12, ref: [0, 1, 0], cor: (q, t) => { const v = (.55 - t * .35) * (.8 + fbm(q.x * 30, q.y * 30, q.z * 30) * .4), sg = t > .5 ? .5 : 0; return [v + sg * .1, v * (1 - sg), v * (1 - sg)]; }, fim: .6, deform: (q, d, t, a) => (d.y * -sinal > .3 ? -.012 : 0) }), 120, { len: .07, wid: .04, fluxo: [0, sinal * .3, -1], levanta: .7, cor: corPelo(.45, .1), filtro: (b, nn) => nn.y * sinal > -.2 });
        malha(j, tubo([[0, -sinal * .012, .01], [0, -sinal * .016, L0 * .5], [0, -sinal * .005, L0 * .95]], [[.06, .012], [.045, .01], [.015, .006]], { nr: 8, nl: 10, ref: [0, 1, 0], cor: [.8, .3, .3] }), mCarne);
        const ds = [];
        [-1, 1].forEach(sx => { for (let i = 0; i < 11; i++) { const t = i / 10, z = .015 + t * L0 * .92, x = sx * (.068 - t * .045), l = .028 + (1 - t) * .03 + (i === 2 ? .03 : 0) + r2() * .012; ds.push(por(new T.ConeGeometry(.0065, l, 5), [x, -sinal * (.012 + l / 2), z], [sinal > 0 ? Math.PI : 0, 0, sx * .12])); } });
        for (let i = 0; i < 3; i++) ds.push(por(new T.ConeGeometry(.007, .035, 5), [(i - 1) * .012, -sinal * .03, L0 * .97], [sinal > 0 ? Math.PI - .4 : .4, 0, 0]));
        malha(j, juntar(ds), mDente);
        // baba de sangue pendurada
        if (sinal < 0) malha(j, juntar([0, 1, 2].map(i => tubo([[(i - 1) * .04, .0, .12 + i * .06], [(i - 1) * .04, -.05 - i * .02, .12 + i * .06], [(i - 1) * .042, -.09 - i * .03, .125 + i * .06]], [.004, .003, .007], { nr: 5, nl: 5, fim: 1 }))), mSangue);
        return j;
      };
      const maxila = mandibula(1), mand = mandibula(-1);
      // olho vermelho grande de um lado; do outro, um olho miúdo quase apagado
      malha(cab, new T.SphereGeometry(.032, 12, 10), mOlho, [-.078, .05, .07]);
      malha(cab, new T.SphereGeometry(.06, 10, 8), F.guardar(new T.MeshBasicMaterial({ color: L('#ff2010'), transparent: true, opacity: .22, blending: T.AdditiveBlending, depthWrite: false })), [-.085, .05, .07]);
      malha(cab, new T.SphereGeometry(.012, 8, 6), mOlhoMorto, [.075, .04, .065]);

      /* ---------- braços longos, mãos de garras ---------- */
      const bracos = [-1, 1].map(sd => {
        const ombro = junta(peito, sd * .3, .6, .02); ombro.rotation.set(-1.15, 0, sd * .4);
        peca(ombro, tubo([[0, .06, 0], [0, -.24, -.03], [0, -.48, 0]], [.1, .09, .07], { nr: 12, nl: 10, cor: tomPele() }), 280, { len: .13, wid: .06, fluxo: [0, -1, -.2], cor: b => corPelo(.2 + Math.max(0, .06 - b.y) * 1.2)(b) });
        const cotov = junta(ombro, 0, -.48, 0); cotov.rotation.x = -.6;
        peca(cotov, tubo([[0, .03, 0], [0, -.22, .02], [0, -.45, .03]], [.075, .07, .05], { nr: 12, nl: 10, cor: tomPele(.2) }), 220, { len: .12, wid: .055, fluxo: [0, -1, -.3], cor: q => corPelo(.25 + Math.max(0, -q.y - .15) * 2.5)(q) });
        const pulso = junta(cotov, 0, -.45, .03);
        malha(pulso, tubo([[0, .02, 0], [0, -.06, .015], [0, -.1, .02]], [[.03, .055], [.032, .06], [.028, .055]], { nr: 10, nl: 6, cor: [.4, .15, .14] }), mPele);
        const dedos = [];
        for (let i = 0; i < 4; i++) {
          const zz = (i - 1.5) * .032, d = junta(pulso, 0, -.095, zz + .02), l = .15 - Math.abs(i - 1.5) * .015, cc = -sd;
          malha(d, tubo([[0, .005, 0], [0, -l * .5, 0], [cc * .02, -l, 0]], [.013, .011, .009], { nr: 6, nl: 6, cor: [.4, .14, .13] }), mPele);
          malha(d, tubo([[cc * .02, -l + .005, 0], [cc * .03, -l - .04, 0], [cc * .065, -l - .075, 0]], [.011, .007, .0008], { nr: 6, nl: 7, fim: 1.5 }), mGarra);
          dedos.push(d);
        }
        // sangue pingando das garras
        malha(pulso, juntar([0, 1].map(i => tubo([[0, -.12, (i - .5) * .05], [0, -.2, (i - .5) * .05], [0, -.24 - i * .04, (i - .5) * .052]], [.004, .003, .007], { nr: 5, nl: 5, fim: 1 }))), mSangue);
        return { ombro, cotov, pulso, dedos, sd };
      });

      /* ---------- animação inquieta: fareja, sacode a cabeça, estala a bocarra, cauda chicoteando ---------- */
      const ra = K.rngDe(K.semente + 77), des = ra() * 10;
      let fase = 0, ritmo = 0, prox = .8, alvo = [0, 0, 0], cr = [0, 0, 0], fareja = 0, estalo = 0;
      const ap = (o, k2, v, vel, dt) => { o[k2] += (v - o[k2]) * Math.min(1, dt * vel); };
      const anim = (dt, t, andando) => {
        const tt = t + des;
        const resp = Math.sin(tt * 2.4) * .6 + Math.sin(tt * 5.1) * .15;
        peito.scale.set(1 + resp * .025, 1, 1 + resp * .035);
        nuc.pulso(tt); luz.intensity = .35 + nuc.mat.emissiveIntensity * .15;
        // a cada pouco: vira a cabeça de estalo, fareja ou estala a bocarra
        prox -= dt;
        if (prox <= 0) { prox = .35 + ra() * 1.6; const r = ra(); alvo = [(ra() - .5) * 1.3, (ra() - .5) * .6, (ra() - .5) * .5]; if (r < .4) fareja = .8 + ra() * .8; else if (r < .6) estalo = .5; }
        for (let i = 0; i < 3; i++) cr[i] += (alvo[i] - cr[i]) * Math.min(1, dt * 18);
        fareja = Math.max(0, fareja - dt); estalo = Math.max(0, estalo - dt);
        const fz = fareja > 0 ? Math.sin(tt * 34) * .05 : 0;
        cab.rotation.y = cr[0]; cab.rotation.z = cr[1] * .6; cab.rotation.x = -.2 + cr[2] * .5 + fz;
        pesc.rotation.y = cr[0] * .3; pesc.rotation.x = -.55 + fz * .5 + Math.sin(tt * 1.3) * .04;
        const abre = estalo > 0 ? Math.abs(Math.sin(estalo * 14)) : .65 + Math.sin(tt * .8) * .15 + (fareja > 0 ? -.3 : 0);
        maxila.rotation.x = -.15 - abre * .45; mand.rotation.x = .15 + abre * .6;
        ritmo += ((andando ? 1 : 0) - ritmo) * Math.min(1, dt * 4);
        if (andando) fase += dt * 4.2;
        const sn = Math.sin(fase), R = ritmo;
        pernas.forEach((p, i) => {
          const s2 = i ? -sn : sn, lev = Math.max(0, Math.sin(fase + (i ? Math.PI : 0) + 1.3));
          ap(p.coxa.rotation, 'x', -s2 * .4 * R + Math.sin(tt * .7 + i * 2) * .03 * (1 - R), 10, dt);
          ap(p.joelho.rotation, 'x', -lev * .35 * R, 10, dt);
          ap(p.jarrete.rotation, 'x', lev * .5 * R, 10, dt);
        });
        corpo.position.y = -R * Math.abs(Math.cos(fase)) * .05 + (1 - R) * resp * .008;
        corpo.rotation.z = R * sn * .05 + (1 - R) * Math.sin(tt * .9) * .025;
        peito.rotation.x = .78 + R * .1 + Math.sin(tt * 2.4) * .015; peito.rotation.y = -R * sn * .12 + (1 - R) * cr[0] * .15;
        bracos.forEach((b, i) => {
          const s2 = i ? sn : -sn, tique = Math.sin(tt * 11 + i * 3) > .96 ? .25 : 0;
          ap(b.ombro.rotation, 'x', -1.15 + R * s2 * .5 + (1 - R) * (Math.sin(tt * .9 + i) * .06 + tique), 7, dt);
          ap(b.cotov.rotation, 'x', -.6 - R * Math.max(0, s2) * .4 + Math.sin(tt * 1.7 + i) * .05, 7, dt);
          b.dedos.forEach((d, j) => { d.rotation.z = -b.sd * (.25 + .35 * (.5 + .5 * Math.sin(tt * 2.6 + j * .7 + i * 2))); });
        });
        cauda.forEach((c, i) => { c.rotation.x = (i ? .22 : 2.3) + Math.sin(tt * 2.2 - i * .7) * .08; c.rotation.z = Math.sin(tt * 1.6 - i * .6) * (.18 + R * .1) + Math.sin(tt * 7 - i) * .03 * (1 - R); });
      };
      anim(0, 0, false);
      const caixa = new T.Box3().setFromObject(g);
      return { g, alt: +caixa.max.y.toFixed(2), raioBase: .6, anim };
    },
  };
})();

/* ===== forma: lodo ===== */
/* Forma de Filho: figura de lodo.
   Vulto altíssimo e esquálido feito de lodo preto e brilhante: membros compridos pingando, dedos
   longos, cabelo em fios grudados sobre o rosto com dois olhos pálidos acesos, um trapo laranja podre
   num ombro, poça preta no chão, gotas que caem de verdade e fiapos de fumaça.
   Modelo leve; cada exemplar sai um pouco diferente (semente tirada do ser). */
(() => {
  const NS = window.ACF3D = window.ACF3D || {};
  let contador = 0;
  (NS.formasFilho = NS.formasFilho || {}).lodo = {
    nome: 'Lodo (vulto alto que escorre)',
    criar: (F, s) => {
      const T = F.T, g = F.G(), guardar = F.guardar, rng = F.rng || NS.rng, tela = F.tela || NS.tela;
      const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z), CIMA = V3(0, 1, 0);
      const mat = o => guardar(new T.MeshStandardMaterial(o));
      // semente: a do token, se o site mandar; senão o id do ser mais a ordem de criação
      const txt = String((s && (s.semente ?? s.token ?? s.tk)) ?? ((s && s.id || 'x') + ':' + (contador++)));
      let h = 7; for (let i = 0; i < txt.length; i++) h = Math.imul(h ^ txt.charCodeAt(i), 2654435761) >>> 0;
      const R = rng(h % 100000 + 1), varia = (a, b) => a + (b - a) * R();

      /* ================= utilidades ================= */
      const ruido = (x, y, z, k = 0) => Math.sin(1.7 * x + 1.3 * y + k) * Math.sin(1.9 * y - 1.1 * z + 2 * k) * Math.sin(1.3 * z + .7 * x + 3 * k)
        + .5 * Math.sin(3.1 * x - 2.3 * z + k) * Math.sin(2.9 * y + 1.7 * x - k);
      function amassar(q, amp, freq, k) {
        const p = q.attributes.position, nn = q.attributes.normal;
        for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = ruido(x * freq, y * freq, z * freq, k) * amp; p.setXYZ(i, x + nn.getX(i) * d, y + nn.getY(i) * d, z + nn.getZ(i) * d); }
        q.computeVertexNormals(); return q;
      }
      function tubo(pts, raio, seg = 12, rad = 6) {
        const curva = new T.CatmullRomCurve3(pts), q = new T.TubeGeometry(curva, seg, 1, rad, false);
        const p = q.attributes.position, c = V3(), v = V3();
        for (let i = 0; i <= seg; i++) { curva.getPointAt(i / seg, c); const k = typeof raio === 'function' ? raio(i / seg) : raio; for (let j = 0; j <= rad; j++) { const n = i * (rad + 1) + j; v.fromBufferAttribute(p, n).sub(c).multiplyScalar(k).add(c); p.setXYZ(n, v.x, v.y, v.z); } }
        return q;
      }
      function torno(L, perfil, rad = 10, n = 10) { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new T.Vector2(Math.max(.002, perfil(t)), t * L)); } return new T.LatheGeometry(pts, rad); }
      function juntar(lista) {
        let nv = 0, ni = 0; lista.forEach(q => { nv += q.attributes.position.count; ni += q.index.count; });
        const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni), out = new T.BufferGeometry(); let ov = 0, oi = 0;
        lista.forEach(q => { if (!q.attributes.normal) q.computeVertexNormals(); pos.set(q.attributes.position.array, ov * 3); nor.set(q.attributes.normal.array, ov * 3); if (q.attributes.uv) uv.set(q.attributes.uv.array, ov * 2); const ix = q.index.array; for (let k = 0; k < ix.length; k++) idx[oi + k] = ix[k] + ov; oi += ix.length; ov += q.attributes.position.count; q.dispose(); });
        out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nor, 3)); out.setAttribute('uv', new T.BufferAttribute(uv, 2)); out.setIndex(new T.BufferAttribute(idx, 1)); out.computeBoundingSphere();
        return guardar(out);
      }
      const tique = (t, per, dur, fase = 0) => { const p = ((t + fase) % per) / dur; return p < 1 ? Math.sin(p * Math.PI) : 0; };

      /* ================= texturas ================= */
      // lodo: manchas marrom-escuras, veios e bolhas (cor) e relevo
      const tLodo = (() => {
        const N = 512, [c, x] = tela(N, N), [cb, xb] = tela(N, N), r = rng(19);
        x.fillStyle = '#0b0807'; x.fillRect(0, 0, N, N); xb.fillStyle = '#808080'; xb.fillRect(0, 0, N, N);
        for (let i = 0; i < 260; i++) {
          const x0 = r() * N, y0 = r() * N, rr = 6 + r() * 40, a = r() * .14;
          [-N, 0, N].forEach(o => { const gr = x.createRadialGradient(x0 + o, y0, 0, x0 + o, y0, rr); gr.addColorStop(0, `rgba(${60 + r() * 40 | 0},${40 + r() * 20 | 0},${28},${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(x0 + o - rr, y0 - rr, rr * 2, rr * 2);
            const gb = xb.createRadialGradient(x0 + o, y0, 0, x0 + o, y0, rr); const v = r() < .5 ? 255 : 0; gb.addColorStop(0, `rgba(${v},${v},${v},${.25})`); gb.addColorStop(1, `rgba(${v},${v},${v},0)`); xb.fillStyle = gb; xb.fillRect(x0 + o - rr, y0 - rr, rr * 2, rr * 2); });
        }
        // veios escorrendo (ao longo do comprimento)
        for (let i = 0; i < 70; i++) { const y0 = r() * N, x0 = r() * N, L = 40 + r() * 200; x.strokeStyle = `rgba(90,70,55,${.08 + r() * .12})`; x.lineWidth = 1 + r() * 2; x.beginPath(); x.moveTo(x0, y0); x.bezierCurveTo(x0 + 20, y0 + (r() - .5) * 20, x0 + L * .6, y0 + (r() - .5) * 30, x0 + L, y0 + (r() - .5) * 10); x.stroke(); xb.strokeStyle = 'rgba(255,255,255,.35)'; xb.lineWidth = 3; xb.stroke(); }
        // bolhas
        for (let i = 0; i < 30; i++) { const x0 = r() * N, y0 = r() * N, rr = 3 + r() * 6; xb.fillStyle = '#ffffff'; xb.beginPath(); xb.arc(x0, y0, rr, 0, 7); xb.fill(); }
        const map = F.texCanvas(c), bump = F.texCanvas(cb); bump.encoding = T.LinearEncoding; [map, bump].forEach(t => { t.wrapS = t.wrapT = T.RepeatWrapping; }); return { map, bump };
      })();
      // trapo laranja podre com furos (transparência) e borda esfiapada
      const tTrapo = (() => {
        const N = 256, [c, x] = tela(N, N), r = rng(31);
        x.fillStyle = '#8c5428'; x.beginPath(); x.moveTo(0, 0); x.lineTo(N, 0);
        for (let k = 0; k <= 16; k++) x.lineTo(N - k * N / 16, N * (.62 + r() * .3) + (k % 2 ? 30 : 0));
        x.closePath(); x.fill();
        x.globalCompositeOperation = 'source-atop';
        for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(${r() < .5 ? '60,25,8' : '200,120,60'},${r() * .15})`; x.fillRect(r() * N, r() * N, 2 + r() * 3, 6 + r() * 16); }
        for (let i = 0; i < 14; i++) { const gr = x.createRadialGradient(0, 0, 1, 0, 0, 30); gr.addColorStop(0, 'rgba(20,10,4,.8)'); gr.addColorStop(1, 'rgba(20,10,4,0)'); x.save(); x.translate(r() * N, r() * N); x.scale(1, 1 + r() * 2); x.fillStyle = gr; x.fillRect(-40, -40, 80, 80); x.restore(); }
        // lodo escorrido de cima
        for (let i = 0; i < 12; i++) { const x0 = r() * N, L = 30 + r() * 120, gr = x.createLinearGradient(0, 0, 0, L); gr.addColorStop(0, 'rgba(8,6,5,.9)'); gr.addColorStop(1, 'rgba(8,6,5,0)'); x.fillStyle = gr; x.fillRect(x0, 0, 3 + r() * 8, L); }
        x.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 9; i++) { x.beginPath(); const x0 = r() * N, y0 = 40 + r() * N * .6, rr = 6 + r() * 16; for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283, d = rr * (.6 + r() * .6); x.lineTo(x0 + Math.cos(a) * d, y0 + Math.sin(a) * d * 1.4); } x.fill(); }
        x.globalCompositeOperation = 'source-over';
        return F.texCanvas(c);
      })();
      // fumaça (sprite)
      const tFumaca = (() => {
        const [c, x] = tela(128, 128), r = rng(5);
        for (let i = 0; i < 26; i++) { const x0 = 64 + (r() - .5) * 60, y0 = 64 + (r() - .5) * 70, rr = 12 + r() * 22, gr = x.createRadialGradient(x0, y0, 0, x0, y0, rr); gr.addColorStop(0, 'rgba(150,145,140,.22)'); gr.addColorStop(1, 'rgba(150,145,140,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); }
        return F.texCanvas(c);
      })();

      const mLodo = guardar(new T.MeshPhysicalMaterial({ color: '#ffffff', map: tLodo.map, bumpMap: tLodo.bump, bumpScale: .08, roughness: .2, metalness: .05, clearcoat: 1, clearcoatRoughness: .06 }));
      const mCabelo = mat({ color: '#040303', roughness: .24, metalness: .1 });
      const mPoca = guardar(new T.MeshPhysicalMaterial({ color: '#070505', roughness: .05, metalness: 0, clearcoat: 1, clearcoatRoughness: .03 }));
      const mTrapo = mat({ color: '#5c4436', map: tTrapo, alphaTest: .5, side: T.DoubleSide, roughness: .92 });
      const mOlho = mat({ color: '#d8e0e8', emissive: '#b8c8d8', emissiveIntensity: 1.6, roughness: .3 });

      /* ================= proporções (variam por exemplar) ================= */
      const K = varia(.93, 1.07), magro = varia(1.35, 1.6), incl = varia(.12, .22), ladoTrapo = R() < .7 ? -1 : 1, braco = varia(.96, 1.08);
      const QUADRIL = 1.5 * K, COXA = .77 * K, CANELA = .73 * K, TORSO = 1.0 * K;

      const corpo = F.G(); g.add(corpo);
      const pelve = F.G(); pelve.position.y = QUADRIL; corpo.add(pelve);
      pelve.add(new T.Mesh(guardar(amassar(new T.SphereGeometry(.13 * magro, 14, 10).scale(1, .7, .75), .01, 9, 2)), mLodo));

      /* ----- tronco esquálido, corcunda (a coluna dobra para a frente acima da cintura) ----- */
      const tronco = F.G(); tronco.rotation.x = incl; pelve.add(tronco);
      const Y0 = TORSO * .38, CORC = varia(.5, .7);
      const angDe = y => y <= Y0 ? 0 : CORC * Math.pow((y - Y0) / (TORSO - Y0), 1.3);
      const dobra = v => { const a = angDe(Math.min(v.y, TORSO * 1.25)), dy = v.y - Y0; if (a === 0) return v; const c = Math.cos(a), sn = Math.sin(a); return V3(v.x, Y0 + dy * c - v.z * sn, dy * sn + v.z * c); };
      const dobrarGeo = q => { const p = q.attributes.position, v = V3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const w = dobra(v); p.setXYZ(i, w.x, w.y, w.z); } q.computeVertexNormals(); return q; };
      const preso = (obj, x, y, z) => { obj.position.copy(dobra(V3(x, y, z))); obj.rotation.x += angDe(y); tronco.add(obj); return obj; };
      { const q = torno(TORSO, t => (t < .25 ? .12 - .14 * t : t < .75 ? .085 + .075 * Math.sin((t - .25) / .5 * Math.PI * .8) : .13 - .25 * (t - .75)) * magro, 14, 18);
        q.scale(1, 1, .72); amassar(q, .008, 14, 3); tronco.add(new T.Mesh(dobrarGeo(guardar(q)), mLodo));
        // costelas, vértebras e omoplatas saltadas
        const pecas = [];
        for (let i = 0; i < 6; i++) { const y = TORSO * (.48 + i * .05), rr = .125 * magro * (1 - Math.abs(i - 2) * .06); const c2 = new T.TorusGeometry(rr, .009, 4, 14, Math.PI * .9); c2.rotateX(Math.PI / 2); c2.rotateY(.15 * Math.PI); c2.scale(1, 1, .72); c2.translate(0, y - i * .006, .006); pecas.push(c2); }
        for (let i = 0; i < 13; i++) { const v = new T.SphereGeometry(.024, 6, 4); v.translate(0, TORSO * (.12 + i * .065), -.075 * magro - .006); pecas.push(v); }
        [-1, 1].forEach(sx => { const o = new T.SphereGeometry(.07, 10, 8); o.scale(.9, 1.2, .35); o.rotateZ(sx * .3); o.translate(sx * .075 * magro, TORSO * .76, -.07 * magro); pecas.push(o); });
        tronco.add(new T.Mesh(dobrarGeo(juntar(pecas)), mLodo)); }

      /* ----- pescoço comprido e cabeça pendurada para a frente ----- */
      const topoP = dobra(V3(0, TORSO * .97, .01)), cabP = dobra(V3(0, TORSO * 1.16, .16)), meioP = dobra(V3(0, TORSO * 1.08, .05));
      tronco.add(new T.Mesh(guardar(tubo([topoP, meioP, cabP], t => .055 - .015 * t, 8, 7)), mLodo));
      const cab = F.G(); cab.position.copy(cabP); cab.rotation.set(-incl - CORC + .55 + varia(-.08, .12), 0, varia(-.25, .25)); tronco.add(cab);
      { const q = new T.SphereGeometry(.12, 20, 16); q.scale(.78, 1.12, .92);
        const p = q.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i); if (y < 0) p.setZ(i, z * (1 - .25 * (-y / .13))); if (y < -.05 && z > 0) p.setY(i, y - .04 * z / .1); } q.computeVertexNormals();
        amassar(q, .006, 18, 5); q.translate(0, .07, .04); cab.add(new T.Mesh(guardar(q), mLodo)); }
      // olhos pálidos acesos, fundos no rosto
      const olhos = [-1, 1].map(sx => { const o = new T.Mesh(guardar(new T.SphereGeometry(.017, 10, 8)), mOlho); o.scale.set(1.3, .8, .6); o.position.set(sx * .042, .085, .135); cab.add(o); return o; });
      const [cH, xH] = tela(64, 64); { const gr = xH.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(230,240,255,.9)'); gr.addColorStop(.25, 'rgba(180,200,230,.3)'); gr.addColorStop(1, 'rgba(150,170,200,0)'); xH.fillStyle = gr; xH.fillRect(0, 0, 64, 64); }
      const mHalo = guardar(new T.SpriteMaterial({ map: F.texCanvas(cH), blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
      olhos.forEach(o => { const hs = new T.Sprite(mHalo); hs.scale.set(.07, .07, 1); hs.position.set(o.position.x, o.position.y, o.position.z + .01); cab.add(hs); });
      // cabelo em mechas grudadas caindo pela frente e pelos lados (vãos na altura dos olhos)
      const fios = [];
      { const lista = [], n = 16 + Math.floor(R() * 5);
        for (let i = 0; i < n; i++) {
          let a = -2.5 + i / (n - 1) * 5 + (R() - .5) * .2;
          if (Math.abs(Math.abs(a) - .45) < .14) a += Math.sign(a || 1) * .22 * (Math.abs(a) < .45 ? -1 : 1); // deixa os olhos à mostra
          const fr = Math.cos(a) > .3, x0 = Math.sin(a) * .088, z0 = Math.cos(a) * .095 + .04, y0 = .18;
          const L = (fr ? .2 : .4) + R() * (fr ? .18 : .3), ab = fr ? .015 : .05, gr = (fr ? .016 : .021) * (.8 + R() * .5);
          const pts = [V3(x0 * .3, y0 + .04, z0 * .2 - .02), V3(x0, y0, z0), V3(x0 * 1.2 + Math.sin(a) * ab, y0 - L * .3, z0 * 1.15 + (fr ? .03 : 0)), V3(x0 * 1.1 + Math.sin(a) * ab * 1.5 + (R() - .5) * .02, y0 - L * .65, z0 * 1.1 + (fr ? .025 : -.03)), V3(x0 * (1 + R() * .25), y0 - L, z0 * 1.05 - (fr ? 0 : .04))];
          lista.push(tubo(pts, t => gr * (1 - t * .75) * (1 + .3 * Math.sin(t * 9 + i)) + (t > .9 ? .006 : 0), 12, 5));
          if (fr && R() < .6) fios.push(pts[4]);
        }
        cab.add(new T.Mesh(juntar(lista), mCabelo)); }
      // baba comprida pendurada do queixo
      { const lista = []; for (let i = 0; i < 3; i++) { const x0 = (i - 1) * .025, L = .25 + R() * .3; lista.push(tubo([V3(x0, .0, .1), V3(x0 + .005, -.08, .11), V3(x0, -L * .7, .1), V3(x0, -L, .1)], t => .01 * (1 - t * .6) + (t > .93 ? .008 : 0), 8, 4)); } cab.add(new T.Mesh(juntar(lista), mLodo)); }

      /* ----- braços compridos pendurados e mãos de dedos longos ----- */
      const bracos = [-1, 1].map(sx => {
        const omb = preso(F.G(), sx * .17 * magro, TORSO * .86, -.01); const ombX = omb.rotation.x; omb.rotation.set(-incl - ombX - .05, 0, sx * .08); omb.userData.x0 = -incl - ombX - .05;
        omb.add(new T.Mesh(guardar(amassar(new T.SphereGeometry(.055, 10, 8), .006, 20, sx)), mLodo));
        const L1 = .68 * K * braco, L2 = .66 * K * braco;
        const q1 = torno(L1, t => (.042 + .012 * Math.sin(t * Math.PI) - .012 * t) * magro, 8, 8); q1.rotateX(Math.PI); amassar(q1, .005, 16, sx + 1);
        omb.add(new T.Mesh(guardar(q1), mLodo));
        const cot = F.G(); cot.position.y = -L1; omb.add(cot); cot.rotation.x = -.18;
        cot.add(new T.Mesh(guardar(new T.SphereGeometry(.036 * magro, 8, 6)), mLodo));
        const q2 = torno(L2, t => (.034 + .01 * Math.sin(t * Math.PI * .8) - .012 * t) * magro, 8, 8); q2.rotateX(Math.PI); amassar(q2, .004, 18, sx + 3);
        cot.add(new T.Mesh(guardar(q2), mLodo));
        const pulso = F.G(); pulso.position.y = -L2; cot.add(pulso);
        const palma = new T.SphereGeometry(.045, 10, 8); palma.scale(.55, 1.4, .9); palma.translate(0, -.05, 0); pulso.add(new T.Mesh(guardar(palma), mLodo));
        // dedos: cada um num pivô para poder fechar e abrir
        const dedos = [];
        for (let i = 0; i < 5; i++) {
          const pol = i === 4, d = F.G(); d.position.set(sx * (pol ? -.02 : .0), -.1 + (pol ? .05 : 0), (pol ? .035 : -.03 + i * .02)); d.rotation.set(0, 0, sx * (pol ? -.35 : (i - 1.5) * .08)); pulso.add(d);
          const L = (pol ? .13 : .2 + (i === 1 || i === 2 ? .06 : 0)) * K, pts = [V3(), V3(0, -L * .35, .01), V3(0, -L * .7, .03), V3(0, -L, .065)];
          d.add(new T.Mesh(guardar(tubo(pts, t => .011 * (1 - t * .6), 8, 5)), mLodo));
          dedos.push(d);
        }
        return { omb, cot, pulso, dedos, sx, ponta: dedos[2] };
      });

      /* ----- pernas compridas, joelhos para dentro ----- */
      const pernas = [-1, 1].map(sx => {
        const qd = F.G(); qd.position.set(sx * .085, 0, 0); qd.rotation.z = -sx * .05; pelve.add(qd);
        const q1 = torno(COXA, t => (.07 - .028 * t + .01 * Math.sin(t * Math.PI)) * magro, 9, 9); q1.rotateX(Math.PI); amassar(q1, .006, 12, sx + 7);
        qd.add(new T.Mesh(guardar(q1), mLodo));
        const jo = F.G(); jo.position.y = -COXA; jo.rotation.z = sx * .09; qd.add(jo);
        jo.add(new T.Mesh(guardar(new T.SphereGeometry(.046 * magro, 10, 8).scale(1, 1.1, 1.15)), mLodo));
        const q2 = torno(CANELA, t => (.045 + .01 * Math.sin(t * Math.PI * .7) - .022 * t) * magro, 9, 9); q2.rotateX(Math.PI); amassar(q2, .006, 14, sx + 9);
        jo.add(new T.Mesh(guardar(q2), mLodo));
        const tor = F.G(); tor.position.y = -CANELA; jo.add(tor);
        // pé comprido e ossudo com dedos
        const lista = [new T.SphereGeometry(.04, 8, 6).scale(1, .8, 1)];
        for (let i = 0; i < 4; i++) lista.push(tubo([V3((i - 1.5) * .022, -.035, .01), V3((i - 1.5) * .026, -.05, .1), V3((i - 1.5) * .03, -.055, .2 + (i === 1 ? .02 : 0))], t => .016 - .008 * t, 6, 5));
        tor.add(new T.Mesh(juntar(lista), mLodo));
        return { qd, jo, tor, sx };
      });

      /* ----- trapo laranja podre num ombro ----- */
      const trapo = (() => {
        const piv = preso(F.G(), ladoTrapo * .14 * magro, TORSO * .92, 0); const pivX = piv.rotation.x;
        const q = new T.CylinderGeometry(.11, .26, .75, 16, 9, true, ladoTrapo > 0 ? -.4 : Math.PI - 1.4 - .4, 3.6);
        q.translate(0, -.35, 0);
        const p = q.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const d = ruido(x * 9, y * 9, z * 9, 3) * .025; const dobra = Math.sin(Math.atan2(z, x) * 7) * .025 * Math.min(1, -y * 3); p.setXYZ(i, x * (1 + d * 3 + dobra * 2) + ladoTrapo * .04 * (-y), y + Math.sin(x * 20) * .015, z * (.9 + dobra * 2) + d); }
        q.computeVertexNormals();
        const me = new T.Mesh(guardar(q), mTrapo); piv.add(me); piv.rotation.set(-incl * .8 - pivX * .8, 0, ladoTrapo * -.18); piv.userData.x0 = piv.rotation.x;
        return piv;
      })();

      /* ----- núcleo roxo no peito (moldura de espinhos) ----- */
      const nucleo = (() => {
        const ng = preso(F.G(), -ladoTrapo * .085, TORSO * .62, .095 * magro); ng.rotation.x -= .15; ng.rotation.y = -ladoTrapo * .35;
        const mNuc = mat({ color: '#5a20b0', emissive: '#9a38ff', emissiveIntensity: 2, roughness: .15 });
        ng.add(new T.Mesh(guardar(new T.SphereGeometry(.035, 16, 12)), mNuc));
        const pecas = [new T.TorusGeometry(.048, .009, 6, 20)];
        for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; pecas.push(tubo([V3(Math.cos(a) * .048, Math.sin(a) * .048, 0), V3(Math.cos(a) * .08, Math.sin(a) * .08, .02), V3(Math.cos(a) * .12, Math.sin(a) * .12, -.01)], t => .007 * (1 - t) + .0015, 5, 4)); }
        ng.add(new T.Mesh(juntar(pecas), mat({ color: '#141016', roughness: .3, metalness: .8 })));
        const [c, x] = tela(64, 64), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(210,140,255,.9)'); gr.addColorStop(.3, 'rgba(150,60,255,.35)'); gr.addColorStop(1, 'rgba(90,0,200,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
        const halo = new T.Sprite(guardar(new T.SpriteMaterial({ map: F.texCanvas(c), blending: T.AdditiveBlending, depthWrite: false, transparent: true }))); halo.scale.set(.32, .32, 1); halo.position.z = .03; ng.add(halo);
        return { mNuc, halo };
      })();

      /* ----- escorridos fixos (estalactites de lodo) em cotovelos, queixo e quadril ----- */
      const estal = (pai, x, y, z, L) => { const q = new T.ConeGeometry(.012, L, 6, 2); q.rotateX(Math.PI); q.translate(x, y - L / 2, z); const ponta = new T.SphereGeometry(.009, 6, 4); ponta.translate(x, y - L, z); return [q, ponta]; };
      bracos.forEach(b => { b.cot.add(new T.Mesh(juntar([...estal(0, 0, -.02, -.035, .1 + R() * .08), ...estal(0, .01, -.3, -.03, .06 + R() * .05)]), mLodo)); });
      pelve.add(new T.Mesh(juntar([...estal(0, .06, -.06, .05, .12), ...estal(0, -.08, -.05, -.06, .09), ...estal(0, .02, -.08, -.08, .16)]), mLodo));

      /* ----- poça e rastro no chão ----- */
      { const sh = new T.Shape(), n = 40;
        for (let i = 0; i <= n; i++) { const a = i / n * 6.283, d = .55 + .14 * Math.sin(a * 3 + 1) + .08 * Math.sin(a * 7) + (Math.sin(a) > .6 ? .5 * (Math.sin(a) - .6) / .4 : 0); const px = Math.cos(a) * d * .9, pz = Math.sin(a) * d; i ? sh.lineTo(px, pz) : sh.moveTo(px, pz); }
        const q = new T.ShapeGeometry(sh, 6); q.rotateX(-Math.PI / 2); q.translate(0, .004, 0);
        const lista = [q];
        for (let i = 0; i < 9; i++) { const c2 = new T.CircleGeometry(.05 + R() * .1, 12); c2.rotateX(-Math.PI / 2); c2.translate((R() - .5) * 1.8, .004, (R() - .5) * 1.8 - .3); lista.push(c2); }
        // rastro escorrendo para trás (por onde veio)
        for (let i = 0; i < 6; i++) { const c2 = new T.CircleGeometry(.12 - i * .012, 14); c2.scale(1, 1.6, 1); c2.rotateX(-Math.PI / 2); c2.translate(Math.sin(i * 1.3) * .12, .004, -.75 - i * .26); lista.push(c2); }
        const poca = new T.Mesh(juntar(lista), mPoca); g.add(poca); }

      /* ----- gotas que caem de verdade (com respingo no chão) ----- */
      const qGota = guardar(new T.SphereGeometry(.014, 8, 6)), qResp = guardar(new T.RingGeometry(.01, .03, 14).rotateX(-Math.PI / 2));
      const mResp = mat({ color: '#0a0807', roughness: .05, transparent: true, opacity: .8, depthWrite: false });
      const fontes = [];
      bracos.forEach(b => b.dedos.slice(0, 4).forEach(d => fontes.push({ o: d, p: V3(0, -.2 * K, .065) })));
      fios.slice(0, 4).forEach(p => fontes.push({ o: cab, p }));
      fontes.push({ o: cab, p: V3(0, -.35, .1) });
      const gotas = fontes.slice(0, 10).map((f, i) => {
        const me = new T.Mesh(qGota, mLodo); g.add(me); const rs = new T.Mesh(qResp, mResp); rs.visible = false; g.add(rs);
        return { f, me, rs, y: 0, vy: 0, cresce: R() * 1.5, solta: false, rt: 0 };
      });
      const wpos = V3();
      const posFonte = f => { f.o.updateWorldMatrix(true, false); wpos.copy(f.p); f.o.localToWorld(wpos); g.updateWorldMatrix(true, false); return g.worldToLocal(wpos); };

      /* ----- fiapos de fumaça subindo ----- */
      const fumacas = [0, 1, 2, 3].map(i => { const sp = new T.Sprite(guardar(new T.SpriteMaterial({ map: tFumaca, color: '#8a8580', transparent: true, depthWrite: false, opacity: 0 }))); g.add(sp); return { sp, f: i / 4 + R() * .1, x: (R() - .5) * .5, z: (R() - .5) * .3 }; });

      /* ================= animação ================= */
      let fase = 0, kAnda = 0;
      const anim = (dt, t, andando) => {
        kAnda += ((andando ? 1 : 0) - kAnda) * Math.min(1, dt * 2.5);
        fase += dt * 3.2 * kAnda;
        const pas = Math.sin(fase), pas2 = Math.cos(fase);
        // andar lento e arrastado: passadas longas, quadril balançando
        pernas.forEach((p, i) => {
          const s1 = i ? pas : -pas, s2 = i ? pas2 : -pas2;
          p.qd.rotation.x = -s1 * .38 * kAnda - .12;
          p.jo.rotation.x = (Math.max(0, s2) * .75 * kAnda) + .22;
          p.tor.rotation.x = -p.qd.rotation.x - p.jo.rotation.x * .9;
        });
        corpo.position.y = -Math.abs(pas) * .05 * kAnda - .02 * (1 - Math.cos(t * .9)) * .5;
        corpo.position.x = Math.sin(fase) * .04 * kAnda;
        corpo.rotation.z = Math.sin(fase) * .05 * kAnda + Math.sin(t * .53) * .025;
        corpo.rotation.y = Math.sin(fase) * .08 * kAnda;
        // tronco respira de forma irregular e treme às vezes
        const espasmo = tique(t, 4.7, .25, .8);
        tronco.rotation.x = incl + Math.sin(t * 1.3 + Math.sin(t * .41) * 2) * .025 + kAnda * .06 + espasmo * .07;
        tronco.rotation.z = espasmo * Math.sin(t * 40) * .03;
        // braços pendurados balançando com atraso; dedos fechando e abrindo um por um
        bracos.forEach((b, i) => {
          const s1 = i ? -pas : pas;
          b.omb.rotation.x = b.omb.userData.x0 + s1 * .28 * kAnda + Math.sin(t * .8 + i * 2) * .03;
          b.omb.rotation.z = b.sx * (.08 + .03 * Math.sin(t * .6 + i));
          b.cot.rotation.x = -.18 - Math.max(0, -s1) * .3 * kAnda - .05 * Math.sin(t * .9 + i);
          b.dedos.forEach((d, k) => { d.rotation.x = -.15 - .5 * Math.max(0, Math.sin(t * .7 + k * .5 + i * 3)) ** 2 - tique(t, 3.1 + i, .4, k * .07) * .4; });
        });
        // cabeça: balança e dá giros bruscos de lado
        const vira = tique(t, 5.9, .55, 2.1), vira2 = tique(t, 8.3, .4, 5.5);
        cab.rotation.y = Math.sin(t * .37) * .2 + vira * .9 - vira2 * .6;
        cab.rotation.z = Math.sin(t * .5) * .1 + vira * .35;
        olhos.forEach(o => { o.scale.y = .8 * (tique(t, 4.3, .15) > .5 ? .15 : 1); });
        trapo.rotation.z = ladoTrapo * -.18 + Math.sin(t * 1.1) * .04 + Math.sin(fase) * .06 * kAnda;
        trapo.rotation.x = trapo.userData.x0 + Math.sin(t * .8 + 1) * .04;
        // gotas: crescem na ponta, soltam, caem e respingam
        gotas.forEach((gt, i) => {
          if (!gt.solta) { const p = posFonte(gt.f); gt.me.position.copy(p); gt.cresce += dt; const k = Math.min(1, gt.cresce / 1.6); gt.me.scale.set(.5 + .5 * k, .6 + 1.2 * k, .5 + .5 * k); if (gt.cresce > 1.6 + (i % 3) * .5) { gt.solta = true; gt.vy = 0; } }
          else { gt.vy -= 9.8 * dt; gt.me.position.y += gt.vy * dt; gt.me.scale.set(.8, 1.6, .8);
            if (gt.me.position.y <= .01) { gt.solta = false; gt.cresce = 0; gt.rs.visible = true; gt.rs.position.set(gt.me.position.x, .006, gt.me.position.z); gt.rt = 0; } }
          if (gt.rs.visible) { gt.rt += dt; gt.rs.scale.setScalar(1 + gt.rt * 6); if (gt.rt > .35) gt.rs.visible = false; }
        });
        // fumaça
        fumacas.forEach(f => { const u = ((t * .12 + f.f) % 1); f.sp.position.set(f.x + Math.sin(t * .5 + f.f * 9) * .15 * u, 1.9 * K + u * 1.1, f.z - .1 + u * .1); f.sp.scale.setScalar(.35 + u * .9); f.sp.material.opacity = Math.sin(u * Math.PI) * .35; f.sp.material.rotation = f.f * 6 + u; });
        const pu = Math.pow(.5 + .5 * Math.sin(t * 1.2), 3);
        nucleo.mNuc.emissiveIntensity = 1.3 + pu * 2.2; nucleo.halo.material.opacity = .4 + pu * .6;
      };
      return { g, alt: 2.6 * K, raioBase: .5, anim };
    },
  };
})();

/* ===== forma: marionetista ===== */
/* marionetista.js · forma de Filho: titereiro alto e esquelético de casaco longo em farrapos e gravata
   de laço, rosto de caveira gritando, mãos ossudas (uma segura uma batuta fina como agulha); fios
   vermelhos sobem dos dedos e do alto até bonecos-cadáveres de macacão laranja pendurados em volta.
   Formato: ACF3D.formasFilho.marionetista = { nome, criar(F, s) → { g, alt, raioBase, anim } } */
(() => {
  'use strict';
  const NS = window.ACF3D = window.ACF3D || {};
  /* ---------- kit de modelagem (o mesmo nas formas detalhadas) ---------- */
  function kit(F) {
    const T = F.T, U = T.BufferGeometryUtils, V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
    const vv = p => (p && p.isVector3 ? p : V(p[0], p[1], p[2]));
    // material: as cores são escritas como aparecem na tela (vão para o espaço linear aqui)
    const mat = (p = {}, fisico) => {
      const q = { ...p };
      ['color', 'emissive'].forEach(k => { if (typeof q[k] === 'string') q[k] = new T.Color(q[k]).convertSRGBToLinear(); });
      if (q.duplo) { q.side = T.DoubleSide; delete q.duplo; }
      return F.guardar(fisico ? new T.MeshPhysicalMaterial(q) : new T.MeshStandardMaterial(q));
    };
    const tela = (w, h) => NS.tela(w, h || w);
    const tex = (c, rep) => F.texCanvas(c, rep);
    const malha = (pai, geo, m) => { const me = new T.Mesh(F.guardar(geo), m); pai.add(me); return me; };
    const grupo = (pai, x = 0, y = 0, z = 0) => { const g = new T.Group(); g.position.set(x, y, z); if (pai) pai.add(g); return g; };
    // ruído suave (valor) e fractal, para deformar vértices e pintar texturas
    const fr = v => v - Math.floor(v), h3 = (i, j, k) => fr(Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453);
    const sm = t => t * t * (3 - 2 * t), L = (a, b, t) => a + (b - a) * t;
    function vn(x, y, z) {
      const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), u = sm(x - i), v = sm(y - j), w = sm(z - k);
      const a = L(L(h3(i, j, k), h3(i + 1, j, k), u), L(h3(i, j + 1, k), h3(i + 1, j + 1, k), u), v);
      const b = L(L(h3(i, j, k + 1), h3(i + 1, j, k + 1), u), L(h3(i, j + 1, k + 1), h3(i + 1, j + 1, k + 1), u), v);
      return L(a, b, w) * 2 - 1;
    }
    const fbm = (x, y, z, o = 3) => { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * vn(x * f, y * f, z * f); a *= .5; f *= 2.03; } return s; };
    function deform(geo, fn) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const r = fn(p.getX(i), p.getY(i), p.getZ(i), i); if (r) p.setXYZ(i, r[0], r[1], r[2]); }
      p.needsUpdate = true; geo.computeVertexNormals(); return geo;
    }
    /* casca: superfície de revolução de seção elíptica, anel por anel (de baixo para cima).
       perfil: [[y, largura, profundidade, deslocZ, deslocX]]. A frente (+z) fica em u = 0,5 da textura. */
    function casca(perfil, o = {}) {
      const seg = o.seg || 24, n = perfil.length, pos = [], uv = [], idx = [];
      const ab = o.abertura || 0, ps0 = o.arco ? o.arco[0] : ab ? ab / 2 : Math.PI, pl0 = o.arco ? o.arco[1] : ab ? Math.PI * 2 - ab : Math.PI * 2;
      for (let i = 0; i <= seg; i++) {
        const u = i / seg;
        for (let j = 0; j < n; j++) {
          const p = perfil[j], [ps, pl] = o.arcoY ? o.arcoY(p[0], j) : [ps0, pl0], ph = ps + u * pl;
          let sx = Math.sin(ph), sz = Math.cos(ph);
          if (o.quadrado) { sx = Math.sign(sx) * Math.pow(Math.abs(sx), o.quadrado); sz = Math.sign(sz) * Math.pow(Math.abs(sz), o.quadrado); }
          let x = sx * p[1] + (p[4] || 0), y = p[0], z = sz * p[2] + (p[3] || 0);
          if (o.deform) { const r = o.deform(x, y, z, j, u, Math.atan2(Math.sin(ph), Math.cos(ph))); if (r) [x, y, z] = r; }
          pos.push(x, y, z); uv.push(u, j / (n - 1));
        }
      }
      for (let i = 0; i < seg; i++) for (let j = 0; j < n - 1; j++) { const a = i * n + j, b = (i + 1) * n + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx); geo.computeVertexNormals(); return geo;
    }
    // tubo que afina ao longo de uma curva: raio(t), t de 0 a 1 (u da textura corre ao longo do tubo)
    function tubo(pts, raio, o = {}) {
      const curva = new T.CatmullRomCurve3(pts.map(vv), false, 'catmullrom', o.tensao ?? .5);
      const nS = o.seg || 16, nR = o.rad || 6, geo = new T.TubeGeometry(curva, nS, 1, nR, false);
      const pos = geo.attributes.position, P = V();
      for (let i = 0; i <= nS; i++) {
        curva.getPointAt(i / nS, P); const rr = typeof raio === 'number' ? raio : raio(i / nS);
        for (let j = 0; j <= nR; j++) { const k = i * (nR + 1) + j; pos.setXYZ(k, P.x + (pos.getX(k) - P.x) * rr, P.y + (pos.getY(k) - P.y) * rr, P.z + (pos.getZ(k) - P.z) * rr); }
      }
      geo.computeVertexNormals(); return geo;
    }
    // cápsula pendurada: pivô no topo (y = 0), desce até -comp
    function capsula(r1, r2, comp, seg = 8, anel = 3) {
      const pf = [];
      for (let a = 0; a <= anel; a++) { const t = a / anel * Math.PI / 2; pf.push(new T.Vector2(Math.max(1e-4, r2 * Math.sin(t)), -comp - r2 * Math.cos(t))); }
      for (let a = 1; a <= anel; a++) { const t = Math.PI / 2 + a / anel * Math.PI / 2; pf.push(new T.Vector2(Math.max(1e-4, r1 * Math.sin(t)), -r1 * Math.cos(t))); }
      return new T.LatheGeometry(pf, seg);
    }
    // fita (tira de pano) ao longo de uma curva; a face olha para fora do eixo y (ou para normal(P, t))
    function fita(pts, larg, o = {}) {
      const curva = new T.CatmullRomCurve3(pts.map(vv), false, 'catmullrom', .5), n = o.seg || 24, pos = [], uv = [], idx = [];
      const P = V(), Tn = V(), N = V(), B = V();
      for (let i = 0; i <= n; i++) {
        const t = i / n; curva.getPointAt(t, P); curva.getTangentAt(t, Tn);
        if (o.normal) N.copy(o.normal(P, t)); else N.set(P.x, 0, P.z);
        if (N.lengthSq() < 1e-8) N.set(0, 0, 1); N.normalize();
        B.copy(Tn).cross(N).normalize(); const w = (typeof larg === 'number' ? larg : larg(t)) / 2;
        const tor = o.torcao ? o.torcao(t) : 0;
        for (const s of [-1, 1]) { const q = P.clone().addScaledVector(B, s * w).addScaledVector(N, tor * s * w); pos.push(q.x, q.y, q.z); uv.push(s < 0 ? 0 : 1, t * (o.rep || 1)); }
      }
      for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx); geo.computeVertexNormals(); return geo;
    }
    // junta várias malhas fixas num só desenho por material (menos chamadas de desenho)
    function assar(raiz) {
      if (!U || !U.mergeBufferGeometries) return raiz;
      raiz.updateMatrixWorld(true);
      const inv = raiz.matrixWorld.clone().invert(), grupos = new Map();
      raiz.traverse(o => {
        if (!o.isMesh || o.isInstancedMesh) return;
        let g = o.geometry.clone();
        if (!g.index) { const ix = []; for (let i = 0; i < g.attributes.position.count; i++) ix.push(i); g.setIndex(ix); }
        Object.keys(g.attributes).forEach(k => { if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); });
        if (!g.attributes.uv) g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        if (!g.attributes.normal) g.computeVertexNormals();
        g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, o.matrixWorld));
        if (!grupos.has(o.material)) grupos.set(o.material, []);
        grupos.get(o.material).push(g); o.geometry.dispose();
      });
      const out = new T.Group(); out.position.copy(raiz.position); out.quaternion.copy(raiz.quaternion); out.scale.copy(raiz.scale);
      grupos.forEach((lista, m) => { const geo = U.mergeBufferGeometries(lista); lista.forEach(g => g.dispose()); if (geo) malha(out, geo, m); });
      if (raiz.parent) { raiz.parent.add(out); raiz.parent.remove(raiz); }
      return out;
    }
    // gira obj para que o eixo +y local aponte para eixoY e o +z fique o mais perto possível de eixoZ
    function orientar(obj, eixoY, eixoZ) {
      const y = vv(eixoY).clone().normalize(), z = vv(eixoZ).clone(); z.sub(y.clone().multiplyScalar(z.dot(y))).normalize();
      const x = y.clone().cross(z); obj.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z));
    }
    // orienta obj com eixos dados no espaço de ref (ref pode ser o grupo do modelo)
    function alinharEm(obj, ref, eixoY, eixoZ) {
      const tmp = new T.Object3D(); orientar(tmp, eixoY, eixoZ);
      ref.updateWorldMatrix(true, true); const qr = ref.getWorldQuaternion(new T.Quaternion()), qp = obj.parent.getWorldQuaternion(new T.Quaternion());
      obj.quaternion.copy(qp.invert().multiply(qr).multiply(tmp.quaternion));
    }
    // posição de obj no espaço de ref
    const posEm = (obj, ref, out = V()) => { ref.updateWorldMatrix(true, false); obj.getWorldPosition(out); return ref.worldToLocal(out); };
    // membro de dois ossos (braço ou perna) pendurado em -y, com juntas animáveis
    function membro(pai, L1, L2, r0, r1, r2, m, o = {}) {
      const ombro = grupo(pai), braco = grupo(ombro), cot = grupo(braco, 0, -L1, 0), punho = grupo(cot, 0, -L2, 0);
      const g1 = capsula(r0, r1, L1, o.seg || 8, 3), g2 = capsula(r1 * .95, r2, L2, o.seg || 8, 3);
      if (o.ossudo) [g1, g2].forEach((g, k) => deform(g, (x, y, z) => { const t = Math.min(1, Math.max(0, -y / (k ? L2 : L1))); const b = 1 + o.ossudo * (Math.exp(-Math.pow((t - (k ? .02 : .97)) / .08, 2)) * 1.4 - .25 * Math.sin(t * Math.PI)) + fbm(x * 30, y * 30, z * 30, 2) * .08; return [x * b, y, z * b]; }));
      const m1 = malha(braco, g1, m), m2 = malha(cot, g2, m);
      return { ombro, braco, cot, punho, Lb: L1, La: L2, m1, m2 };
    }
    // IK de dois ossos: põe a mão em alvo, com o cotovelo apontando para polo (no espaço do pai do ombro)
    function ik(br, alvo, polo) {
      const P = br.ombro.position.clone(), Tg = vv(alvo).clone(), u = Tg.clone().sub(P); let d = u.length(); u.normalize();
      const L1 = br.Lb, L2 = br.La; d = Math.max(Math.abs(L1 - L2) + 1e-3, Math.min(d, (L1 + L2) * .999));
      const ang = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
      const pv = vv(polo).clone(); pv.sub(u.clone().multiplyScalar(pv.dot(u))).normalize();
      const d1 = u.clone().multiplyScalar(Math.cos(ang)).add(pv.multiplyScalar(Math.sin(ang))).normalize();
      const cot = P.clone().add(d1.clone().multiplyScalar(L1)), d2 = Tg.clone().sub(cot).normalize(), BX = V(0, -1, 0);
      br.ombro.rotation.set(0, 0, 0); br.braco.quaternion.setFromUnitVectors(BX, d1);
      br.cot.quaternion.setFromUnitVectors(BX, d2.applyQuaternion(br.braco.quaternion.clone().invert()));
    }
    /* mão: punho na origem, dedos para -y, palma para +z. lado = -1 mão direita (polegar em -x), +1 esquerda.
       o: { palma, larg, esp, dedo (fator), raio, garra (comprimento), matGarra, abrir } */
    function mao(pai, m, o = {}) {
      const g = grupo(pai), Lp = o.palma || .085, w = o.larg || .07, esp = o.esp || .024, df = o.dedo || 1, rd = o.raio || .0095, lado = o.lado || 1;
      const palma = malha(g, deform(new T.SphereGeometry(1, 10, 8), (x, y, z) => [x * w * .5 * (1 - .12 * y), y * Lp * .5 - Lp * .5, z * esp * .5 * (1 + .3 * y) - (z > 0 ? .002 : 0)]), m);
      const dedos = [], comp = [.92, 1.04, .98, .78], xs = [.36, .12, -.12, -.36], cache = new Map();
      const cap = (r1, r2, l) => { const k = [r1, r2, l].map(v => v.toFixed(4)).join(); if (!cache.has(k)) cache.set(k, capsula(r1, r2, l, 6, 2)); return cache.get(k).clone(); };
      const falange = (pai2, ls, rr, garra) => {
        const segs = []; let p = pai2;
        ls.forEach((l, i) => { const s = grupo(p, 0, i ? -ls[i - 1] : 0, 0); malha(s, cap(rr[i], rr[i + 1], l), m); segs.push(s); p = s; });
        if (garra) { const ponta = malha(p, tubo([[0, -ls[ls.length - 1] + .004, 0], [0, -ls[ls.length - 1] - garra * .55, garra * .12], [0, -ls[ls.length - 1] - garra, garra * .45]], t => rr[rr.length - 1] * 1.1 * (1 - t * .92), { seg: 6, rad: 5 }), o.matGarra || m); ponta.userData.garra = true; }
        return segs;
      };
      for (let f = 0; f < 4; f++) {
        const tot = .085 * df * comp[f], base = grupo(g, xs[f] * w * lado, -Lp * .92 + Math.abs(xs[f]) * Lp * .25, 0);
        base.rotation.z = -xs[f] * lado * (o.abrir ?? .15);
        dedos.push(falange(base, [tot * .43, tot * .32, tot * .25], [rd, rd * .92, rd * .82, rd * .66], o.garra));
      }
      const pol = grupo(g, lado * w * .4, -Lp * .28, esp * .3), dp = 1 + (df - 1) * .45; pol.rotation.set(-.55, -lado * .5, lado * .42);
      dedos.push(falange(pol, [.03 * dp, .026 * dp, .02 * dp], [rd * 1.2, rd * 1.08, rd * .95, rd * .75], o.garra ? o.garra * .7 : 0));
      cache.forEach(c => c.dispose());
      // dobra os dedos: k (0 a 1) por dedo ou um só número; tremor soma um pouco de vida
      const curvar = (k, tremor = 0, t = 0) => dedos.forEach((d, i) => {
        const kk = (Array.isArray(k) ? k[i] : k) + (tremor ? tremor * Math.sin(t * (7 + i * 1.7) + i * 2.1) : 0);
        d.forEach((s, j) => { s.rotation.x = -kk * (i === 4 ? [.25, .5, .4][j] : [.75, 1.05, .8][j]); });
      });
      return { g, dedos, curvar, palma };
    }
    // brilho em volta (sprite somado à luz)
    let texBrilho = null;
    function halo(pai, cor, tam, x = 0, y = 0, z = 0) {
      if (!texBrilho) { const [c, x2] = tela(128); const gr = x2.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x2.fillStyle = gr; x2.fillRect(0, 0, 128, 128); texBrilho = tex(c); }
      const sm2 = F.guardar(new T.SpriteMaterial({ map: texBrilho, color: new T.Color(cor), transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      const sp = new T.Sprite(sm2); sp.scale.set(tam, tam, 1); sp.position.set(x, y, z); pai.add(sp); return sp;
    }
    /* núcleo roxo: esfera brilhante numa moldura escura de espinhos, como patas de aranha (olha para +z) */
    function nucleo(pai, r = .06, o = {}) {
      const g = grupo(pai), luzM = mat({ color: '#2a0640', emissive: '#6a1eff', emissiveIntensity: 1.6, roughness: .15, metalness: .1 });
      const miolo = mat({ color: '#000000', emissive: '#d2b0ff', emissiveIntensity: 1.3 });
      const esf = malha(g, new T.SphereGeometry(r, 20, 14), luzM); esf.scale.z = .8;
      malha(g, new T.SphereGeometry(r * .3, 10, 8), miolo).position.z = r * .66;
      const escuro = mat({ color: '#140c12', roughness: .35, metalness: .55 });
      const mold = grupo(g);
      malha(mold, new T.TorusGeometry(r * 1.12, r * .2, 6, 24), escuro);
      const n = o.pernas || 8;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + .2, c = Math.cos(a), s = Math.sin(a), k = 1 + (i % 2) * .35;
        malha(mold, tubo([[c * r * 1.1, s * r * 1.1, r * .1], [c * r * 1.9 * k, s * r * 1.9 * k, r * .55], [c * r * 2.7 * k, s * r * 2.7 * k, r * .2], [c * r * 3.3 * k, s * r * 3.3 * k - r * .3, -r * .35]], t => r * .16 * (1 - t * .85), { seg: 10, rad: 5 }), escuro);
        const b = .5 + a; malha(mold, new T.ConeGeometry(r * .12, r * .9, 5), escuro).position.set(Math.cos(b) * r * 1.35, Math.sin(b) * r * 1.35, r * .1);
        mold.children[mold.children.length - 1].rotation.z = b - Math.PI / 2;
      }
      const moldA = assar(mold);
      const h = halo(g, o.cor || '#6a22d8', r * (o.halo || 9), 0, 0, r * .9);
      const pulso = t => {
        const ph = (t * .72) % 1, k = Math.exp(-Math.pow((ph - .1) / .05, 2)) + .6 * Math.exp(-Math.pow((ph - .3) / .06, 2));
        luzM.emissiveIntensity = 1.1 + k * 1.5 + Math.sin(t * .5) * .2; h.material.opacity = .35 + k * .4; esf.scale.set(1 + k * .07, 1 + k * .07, .8 + k * .06);
      };
      return { g, pulso, moldura: moldA };
    }
    // utilidades de pintura
    const pinta = {
      grao(x, w, h, n, a, tam = 2, cores) { for (let i = 0; i < n; i++) { x.fillStyle = cores ? cores[(Math.random() * cores.length) | 0] : `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},${a * Math.random()})`; x.globalAlpha = cores ? a * Math.random() : 1; x.fillRect(Math.random() * w, Math.random() * h, tam, tam); } x.globalAlpha = 1; },
      mancha(x, cx, cy, r, cor, a = 1, pontas = 9) { x.save(); x.globalAlpha = a; x.fillStyle = cor; x.beginPath(); for (let i = 0; i <= pontas * 2; i++) { const an = i / (pontas * 2) * Math.PI * 2, rr = r * (.55 + Math.random() * .6); x.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); } x.fill(); x.restore(); },
      escorrido(x, cx, cy, comp, larg, cor, a = 1) { x.save(); x.globalAlpha = a; x.strokeStyle = cor; x.lineCap = 'round'; let px = cx, py = cy; x.lineWidth = larg; x.beginPath(); x.moveTo(px, py); const n = 12; for (let i = 0; i < n; i++) { px += (Math.random() - .5) * larg * .8; py += comp / n; x.lineWidth = larg * (1 - i / n * .6); x.lineTo(px, py); } x.stroke(); x.beginPath(); x.fillStyle = cor; x.arc(px, py, larg * .7, 0, 7); x.fill(); x.restore(); },
      veia(x, x0, y0, ang, comp, larg, cor, a = .5, ramos = 2) { x.save(); x.strokeStyle = cor; x.globalAlpha = a; x.lineCap = 'round'; const rec = (px, py, an, c, l, d) => { x.lineWidth = l; x.beginPath(); x.moveTo(px, py); let qx = px, qy = py; const n = 8; for (let i = 0; i < n; i++) { an += (Math.random() - .5) * .5; qx += Math.cos(an) * c / n; qy += Math.sin(an) * c / n; x.lineTo(qx, qy); if (d > 0 && Math.random() < .18) rec(qx, qy, an + (Math.random() < .5 ? -.7 : .7), c * .5, l * .6, d - 1); } x.stroke(); }; rec(x0, y0, ang, comp, larg, ramos); x.restore(); },
    };
    return { T, V, vv, mat, tela, tex, malha, grupo, fbm, vn, deform, casca, tubo, capsula, fita, assar, orientar, alinharEm, posEm, membro, ik, mao, halo, nucleo, pinta };
  }
  (NS.formasFilho = NS.formasFilho || {}).marionetista = {
    nome: 'Titereiro (bonecos nos fios)',
    criar: (F, s) => {
      const K = kit(F), { T, V, mat, tela, tex, malha, grupo, fbm, deform, casca, tubo, fita, assar, orientar, membro, ik, mao, nucleo, pinta, alinharEm, posEm } = K;
      const R = NS.rng(909), g = grupo(null), PI = Math.PI, U2 = T.BufferGeometryUtils;
      const junta = (pai, lista, m) => { if (!lista.length) return null; const gg = U2 && U2.mergeBufferGeometries(lista); if (gg) { lista.forEach(q => q.dispose()); return malha(pai, gg, m); } lista.forEach(q => malha(pai, q, m)); return null; };
      const interp = (P, y) => { if (y <= P[0][0]) return P[0].slice(1); for (let i = 1; i < P.length; i++) if (y <= P[i][0]) { const a = P[i - 1], b = P[i], k = (y - a[0]) / (b[0] - a[0]); return [1, 2, 3].map(j => a[j] + (b[j] - a[j]) * k); } return P[P.length - 1].slice(1); };

      /* ---------- texturas ---------- */
      // casaco: lã cinza amarronzada, encardida, furos de traça, abas em farrapos (a barra fica embaixo)
      const [cc, xc] = tela(512, 1024);
      let gr = xc.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, '#5a5048'); gr.addColorStop(.6, '#4a4038'); gr.addColorStop(1, '#2e2620'); xc.fillStyle = gr; xc.fillRect(0, 0, 512, 1024);
      for (let i = 0; i < 260; i++) { const x0 = R() * 512, y0 = R() * 1024; xc.strokeStyle = `rgba(${R() < .5 ? '20,16,12' : '120,110,96'},${.06 + R() * .1})`; xc.lineWidth = 1 + R() * 5; xc.beginPath(); xc.moveTo(x0, y0); xc.lineTo(x0 + (R() - .5) * 20, y0 + 40 + R() * 200); xc.stroke(); }
      for (let i = 0; i < 70; i++) pinta.mancha(xc, R() * 512, R() * 1024, 8 + R() * 34, R() < .5 ? '#241c16' : R() < .5 ? '#4a1410' : '#6a6050', .15 + R() * .2);
      for (let i = 0; i < 10; i++) pinta.escorrido(xc, R() * 512, R() * 500, 100 + R() * 300, 2 + R() * 4, '#3a0a08', .55);
      pinta.grao(xc, 512, 1024, 9000, .1, 2);
      xc.globalCompositeOperation = 'destination-out';
      for (let x0 = -10; x0 < 520;) { const w = 8 + R() * 26, l = 60 + R() * 330; xc.beginPath(); xc.moveTo(x0, 1025); xc.lineTo(x0 + w * (.3 + R() * .4), 1024 - l); xc.lineTo(x0 + w, 1025); xc.fill(); x0 += w + R() * 5; }
      for (let i = 0; i < 70; i++) { const y = 380 + Math.pow(R(), .6) * 520; pinta.mancha(xc, R() * 512, y, 4 + R() * 16, '#000', 1, 7); }
      xc.globalCompositeOperation = 'source-over';
      const texC = tex(cc);
      const matCasaco = mat({ map: texC, bumpMap: texC, bumpScale: .006, roughness: .9, alphaTest: .5, duplo: true });
      const matForro = mat({ map: texC, color: '#4a3632', roughness: .95, alphaTest: .5, side: T.BackSide });
      const matFora = mat({ map: texC, bumpMap: texC, bumpScale: .006, roughness: .9, alphaTest: .5, side: T.FrontSide });
      // calça e manga (o mesmo pano, mais fechado)
      const [cm, xm] = tela(256, 256); xm.drawImage(cc, 0, 0, 512, 600, 0, 0, 256, 256);
      const matPano = mat({ map: tex(cm, [2, 2]), roughness: .9 });
      // peito: colete escuro aberto, costelas e tendões à mostra
      const [cp, xp] = tela(512, 512); xp.fillStyle = '#2a2220'; xp.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 60; i++) pinta.mancha(xp, R() * 512, R() * 512, 6 + R() * 22, '#3a302a', .3);
      xp.fillStyle = '#4a3428'; xp.beginPath(); xp.moveTo(180, 0); xp.lineTo(332, 0); xp.lineTo(300, 512); xp.lineTo(212, 512); xp.fill();
      for (let i = 0; i < 9; i++) { const y = 70 + i * 34 + (R() - .5) * 6; xp.strokeStyle = '#120806'; xp.lineWidth = 12; xp.beginPath(); xp.moveTo(176, y); xp.quadraticCurveTo(256, y + 30 + i * 2, 336, y); xp.stroke(); xp.strokeStyle = '#7a6a52'; xp.lineWidth = 4 - i * .2; xp.beginPath(); xp.moveTo(184, y - 3); xp.quadraticCurveTo(256, y + 24 + i * 2, 328, y - 3); xp.stroke(); xp.strokeStyle = 'rgba(60,20,14,.6)'; xp.lineWidth = 2; xp.beginPath(); xp.moveTo(190, y + 4); xp.quadraticCurveTo(256, y + 30 + i * 2, 322, y + 4); xp.stroke(); }
      xp.strokeStyle = '#5e5040'; xp.lineWidth = 8; xp.beginPath(); xp.moveTo(256, 40); xp.lineTo(256, 360); xp.stroke();
      for (let i = 0; i < 20; i++) pinta.veia(xp, 256, 120, R() * PI * 2, 40 + R() * 80, 2.5, '#6a2ab8', .7, 2);
      for (let i = 0; i < 8; i++) pinta.escorrido(xp, 200 + R() * 110, 60 + R() * 100, 100 + R() * 250, 3 + R() * 4, '#4a0a08', .6);
      [150, 362].forEach(x0 => { for (let i = 0; i < 6; i++) { xp.fillStyle = '#8a7a50'; xp.beginPath(); xp.arc(x0, 200 + i * 45, 6, 0, 7); xp.fill(); } });
      pinta.grao(xp, 512, 512, 5000, .1, 2);
      const texPe = tex(cp);
      const matPeito = mat({ map: texPe, bumpMap: texPe, bumpScale: .012, roughness: .7 });
      // pele de caveira: cinza amarelada, rachada
      const [ck, xk] = tela(256, 256); xk.fillStyle = '#a49884'; xk.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 50; i++) pinta.mancha(xk, R() * 256, R() * 256, 4 + R() * 18, R() < .5 ? '#7a6e5a' : '#bcb09a', .35);
      for (let i = 0; i < 26; i++) pinta.veia(xk, R() * 256, R() * 256, R() * 6.3, 20 + R() * 40, 1, '#3a2a1e', .55, 1);
      pinta.grao(xk, 256, 256, 3000, .1, 1);
      const texK = tex(ck, [2, 1]);
      const matOsso = mat({ map: texK, bumpMap: texK, bumpScale: .006, roughness: .6 });
      const matBota = mat({ color: '#2a201a', roughness: .5, metalness: .1 });
      const matCamisa = mat({ color: '#a8a090', roughness: .85, duplo: true });

      /* ---------- pernas compridas e botas ---------- */
      const corpo = grupo(g);
      const pernas = [-1, 1].map(sx => {
        const p = membro(corpo, .62, .6, .06, .045, .038, matPano, { seg: 9 });
        p.ombro.position.set(sx * .1, 1.29, 0);
        const bota = grupo(p.punho); malha(bota, deform(new T.SphereGeometry(.06, 12, 8), (x, y, z) => [x * .85, y * .9 - (y < 0 ? 0 : 0), z * 2.1 + .07]), matBota).position.y = -.025;
        malha(bota, new T.CylinderGeometry(.05, .055, .14, 10), matBota).position.y = .04;
        p.bota = bota; return p;
      });

      /* ---------- tronco: colete aberto, costelas, núcleo ---------- */
      const alto = grupo(corpo, 0, 1.25, 0), tronco = grupo(alto, 0, -1.25, 0);
      const PT = [[1.18, .15, .11, 0], [1.3, .14, .1, 0], [1.45, .13, .095, .005], [1.62, .16, .11, .01], [1.78, .19, .11, .01], [1.88, .21, .1, 0], [1.94, .14, .07, 0], [1.98, .05, .045, .01]];
      const perfT = []; for (let j = 0; j < 22; j++) { const y = 1.18 + j / 21 * .8, q = interp(PT, y); perfT.push([y, q[0], q[1], q[2]]); }
      malha(tronco, casca(perfT, { seg: 28, quadrado: .85 }), matPeito);
      const nuc = nucleo(tronco, .042, { halo: 10 }); { const [w, d, dz] = interp(PT, 1.72); nuc.g.position.set(0, 1.72, d + dz + .004); }
      // casaco longo aberto na frente, abas até o chão em farrapos
      const PC = [[.03, .46, .42, -.07], [.3, .37, .33, -.05], [.7, .28, .24, -.02], [1.05, .2, .17, 0], [1.3, .165, .135, 0], [1.5, .17, .13, .005], [1.72, .23, .135, .005], [1.88, .26, .125, 0], [1.95, .17, .09, 0], [2.0, .085, .07, .005]];
      const perfC = []; for (let j = 0; j < 40; j++) { const y = .03 + j / 39 * 1.97, q = interp(PC, y); perfC.push([y, q[0], q[1], q[2]]); }
      const geoC = casca(perfC, { seg: 40, arcoY: y => { const ab = y > 1.92 ? .55 : y > 1.4 ? .95 : 1.2 + (1.4 - y) * .5; return [ab / 2, PI * 2 - ab]; },
        deform: (x, y, z, j, u, ang) => { const b = Math.max(0, 1.1 - y) / 1.1; const f = 1 + b * (.08 * Math.sin(ang * 7 + fbm(x * 3, y, z * 3) * 3)) + .03 * fbm(x * 8, y * 5, z * 8); return [x * f, y, z * f - (Math.cos(ang) < -.2 ? b * b * .12 : 0)]; } });
      const casacoM = malha(tronco, geoC, matFora); const forro = new T.Mesh(geoC, matForro); tronco.add(forro);
      const baseC = Float32Array.from(geoC.attributes.position.array);
      // lapelas viradas
      [-1, 1].forEach(sx => malha(tronco, fita([[sx * .06, 1.95, .1], [sx * .1, 1.82, .14], [sx * .13, 1.62, .14], [sx * .12, 1.42, .13]], t => .07 - t * .03, { seg: 10, normal: () => V(sx * .3, 0, 1) }), matCasaco));
      // gravata de laço: gola e babados caídos
      malha(tronco, new T.TorusGeometry(.055, .014, 6, 18), matCamisa).rotation.x = PI / 2; tronco.children[tronco.children.length - 1].position.set(0, 1.97, .01);
      for (let i = 0; i < 5; i++) { const x0 = (i - 2) * .018, L = .16 + R() * .08; malha(tronco, fita([[x0, 1.96, .07], [x0 * 1.5, 1.92, .11], [x0 * 2 + (R() - .5) * .02, 1.96 - L * .6, .13], [x0 * 2.2, 1.96 - L, .12]], t => .05 - t * .02, { seg: 10, normal: () => V(0, 0, 1), torcao: t => Math.sin(t * 6 + i) * .6 }), matCamisa); }

      /* ---------- braços erguidos: batuta numa mão, dedos abertos na outra ---------- */
      const bracos = [-1, 1].map(sx => {
        const br = membro(tronco, .4, .4, .034, .026, .021, matOsso, { seg: 9, ossudo: .8 });
        br.ombro.position.set(sx * .23, 1.89, -.01);
        const alvo = sx < 0 ? V(-.5, 2.42, .2) : V(.74, 2.08, .16), polo = sx < 0 ? V(-1, -.6, -.4) : V(.3, -1, -.5);
        ik(br, alvo, polo);
        // mangas do casaco: largas, punho virado, rasgadas
        malha(br.braco, deform(new T.CylinderGeometry(.046, .043, .42, 12, 5, true), (x, y, z) => { const f = 1 + fbm(x * 15, y * 15, z * 15) * .22; return [x * f, y - .2, z * f]; }), matCasaco);
        malha(br.cot, deform(new T.CylinderGeometry(.042, .056, .3, 12, 5, true), (x, y, z) => { const f = 1 + fbm(x * 15, y * 15 + 3, z * 15) * .25; return [x * f, y - .15 + (y < -.1 ? fbm(x * 30, 2, z * 30) * .03 : 0), z * f]; }), matCasaco);
        const m = mao(br.punho, matOsso, sx < 0 ? { palma: .09, larg: .07, esp: .02, dedo: 1.4, raio: .0075, lado: -1, abrir: .2, garra: .02 } : { palma: .095, larg: .075, esp: .02, dedo: 1.7, raio: .0075, lado: 1, abrir: .55, garra: .035 });
        const dA = posEm(br.punho, g).sub(posEm(br.cot, g)).normalize();
        alinharEm(m.g, g, sx < 0 ? dA.clone().negate() : V(-1, .1, 0), sx < 0 ? V(.5, 0, 1) : V(0, -1, .1));
        return { sx, br, m, alvo, polo };
      });
      // batuta fina como agulha
      const batuta = grupo(bracos[0].m.g, 0, -.07, .02);
      alinharEm(batuta, g, V(-.5, .8, .35), V(0, 0, 1));
      malha(batuta, new T.CylinderGeometry(.002, .006, .55, 6), mat({ color: '#c8c0b0', roughness: .3, metalness: .7 })).position.y = .22;
      malha(batuta, new T.CylinderGeometry(.01, .01, .07, 8), mat({ color: '#2a1a14', roughness: .5 })).position.y = -.02;
      const pontaB = grupo(batuta, 0, .5, 0);

      /* ---------- cabeça: caveira gritando, olhos brancos, cabelo desgrenhado ---------- */
      const HC = V(0, 2.1, .03);
      malha(tronco, tubo([[0, 1.95, 0], [0, 2.02, .01], [0, 2.07, .02]], .036, { seg: 5, rad: 10 }), matOsso);
      const cab = grupo(alto, HC.x, HC.y - 1.25, HC.z);
      const [cf, xf] = tela(512, 256), lin = th => th / 2.05 * 256, ly = lin(1.45);
      xf.fillStyle = '#9a8e7a'; xf.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 50; i++) pinta.mancha(xf, R() * 512, R() * 256, 4 + R() * 16, R() < .5 ? '#6e624e' : '#b0a490', .35);
      [-1, 1].forEach(s2 => { const go = xf.createRadialGradient(128 + s2 * 30, ly, 2, 128 + s2 * 30, ly, 24); go.addColorStop(0, '#030202'); go.addColorStop(.6, '#1a120c'); go.addColorStop(1, 'rgba(50,40,30,0)'); xf.fillStyle = go; xf.fillRect(98 + s2 * 30, ly - 30, 60, 60); });
      xf.fillStyle = '#0a0604'; xf.beginPath(); xf.moveTo(121, lin(1.68)); xf.lineTo(128, lin(1.55)); xf.lineTo(135, lin(1.68)); xf.fill();
      [-1, 1].forEach(s2 => { const go = xf.createRadialGradient(128 + s2 * 46, lin(1.8), 2, 128 + s2 * 46, lin(1.8), 24); go.addColorStop(0, 'rgba(20,12,8,.8)'); go.addColorStop(1, 'rgba(20,12,8,0)'); xf.fillStyle = go; xf.fillRect(90 + s2 * 46, lin(1.8) - 28, 76, 56); });
      for (let i = 0; i < 18; i++) pinta.veia(xf, R() * 512, R() * 256, R() * 6.3, 20 + R() * 40, 1, '#2a1a10', .6, 1);
      pinta.grao(xf, 512, 256, 3000, .1, 1);
      const matCab = mat({ map: tex(cf), roughness: .65 });
      malha(cab, deform(new T.SphereGeometry(.1, 26, 18, 0, PI * 2, 0, 2.05), (x, y, z) => { const nx = x / .1, ny = y / .1, fundo = z > 0 ? .016 * Math.exp(-Math.pow(Math.abs(nx) - .45, 2) / .03 - Math.pow(ny + .3, 2) / .05) : 0, orb = z > 0 ? .02 * Math.exp(-Math.pow(Math.abs(nx) - .29, 2) / .012 - Math.pow(ny - .12, 2) / .012) : 0; return [x * .8 * (1 - fundo * 7), y * 1.2, z * .98 - orb]; }), matCab);
      const boca = malha(cab, new T.SphereGeometry(.07, 12, 10), mat({ color: '#140404', roughness: 1 })); boca.position.set(0, -.09, .015); boca.scale.set(.72, 1.6, .9);
      const dentes = mat({ color: '#c0b088', roughness: .45 });
      const dC = grupo(cab); for (let i = 0; i < 10; i++) { const a = (i / 9 - .5) * 1.7, d2 = malha(dC, new T.ConeGeometry(.0055, .018 + R() * .012, 5), dentes); d2.position.set(Math.sin(a) * .056, -.06, Math.cos(a) * .07 + .004); d2.rotation.x = PI; }
      const mand = grupo(cab, 0, -.035, -.02);
      malha(mand, deform(new T.SphereGeometry(.08, 18, 10, 0, PI * 2, PI * .55, PI * .45), (x, y, z) => [x * .68, y * 1.5, z * .88 + .02]), matCab);
      const dM = grupo(mand); for (let i = 0; i < 9; i++) { const a = (i / 8 - .5) * 1.5, d2 = malha(dM, new T.ConeGeometry(.0055, .016 + R() * .012, 5), dentes); d2.position.set(Math.sin(a) * .048, -.05, Math.cos(a) * .062 + .02); }
      // sangue escorrendo da boca
      const matSangue = mat({ color: '#4a0606', roughness: .25, metalness: .1 });
      for (let i = 0; i < 4; i++) { const x0 = (i - 1.5) * .02; malha(mand, tubo([[x0, -.04, .075], [x0 * 1.2, -.09, .08], [x0 * 1.3, -.14 - R() * .05, .07]], t => .005 * (1 - t * .5) + (t > .9 ? .003 : 0), { seg: 8, rad: 5 }), matSangue); }
      assar(dC); assar(dM);
      const matOlho = mat({ color: '#c8c8bc', emissive: '#eef2e4', emissiveIntensity: .8, roughness: .2 });
      [-1, 1].forEach(sx => { const o = malha(cab, new T.SphereGeometry(.011, 10, 8), matOlho); o.position.set(sx * .029, .014, .072); K.halo(cab, '#e8eedc', .035, sx * .029, .014, .088); });
      const fiosC = [];
      for (let i = 0; i < 46; i++) { const a = PI + (i / 45 - .5) * 4.6 + (R() - .5) * .2, el = .3 + R() * 1.1, sx = Math.sin(a), sz = Math.cos(a), L = .12 + R() * .2, q = []; for (let j = 0; j <= 4; j++) { const v2 = j / 4; q.push([sx * (.08 + v2 * L * .6) * Math.sin(el), Math.cos(el) * .1 + .02 - v2 * L * .7 + Math.sin(v2 * 5 + i) * .015, sz * (.085 + v2 * L * .5) * Math.sin(el) - .01]); } fiosC.push(tubo(q, t => .005 * (1 - t * .7), { seg: 8, rad: 3 })); }
      junta(cab, fiosC, mat({ color: '#1e1a16', roughness: .8 }));

      /* ---------- bonecos-cadáveres pendurados ---------- */
      const [cj, xj] = tela(256, 256); xj.fillStyle = '#a65a1a'; xj.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 60; i++) pinta.mancha(xj, R() * 256, R() * 256, 5 + R() * 24, R() < .4 ? '#5a2a10' : R() < .5 ? '#4a1008' : '#c8782a', .3);
      for (let i = 0; i < 6; i++) pinta.escorrido(xj, R() * 256, R() * 100, 60 + R() * 120, 3 + R() * 4, '#3a0806', .6);
      xj.strokeStyle = 'rgba(40,16,6,.6)'; xj.lineWidth = 2; xj.setLineDash([5, 4]); xj.beginPath(); xj.moveTo(128, 0); xj.lineTo(128, 256); xj.stroke(); xj.setLineDash([]);
      xj.fillStyle = '#2a1a10'; xj.fillRect(150, 40, 40, 14);
      pinta.grao(xj, 256, 256, 3000, .1, 2);
      const matMacacao = mat({ map: tex(cj), roughness: .85 });
      const [cb2, xb2] = tela(128, 128); xb2.fillStyle = '#8e8676'; xb2.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 20; i++) pinta.mancha(xb2, R() * 128, R() * 128, 3 + R() * 12, R() < .5 ? '#6a6252' : '#a8a090', .4);
      for (let i = 0; i < 10; i++) pinta.veia(xb2, R() * 128, R() * 128, R() * 6.3, 15 + R() * 30, 1, '#2a2018', .7, 1);
      xb2.strokeStyle = '#3a1410'; xb2.lineWidth = 1.2; for (let i = 0; i < 4; i++) { const y0 = 20 + R() * 90, x0 = R() * 100; xb2.beginPath(); xb2.moveTo(x0, y0); xb2.lineTo(x0 + 26, y0 + (R() - .5) * 8); xb2.stroke(); for (let k = 0; k < 6; k++) { xb2.beginPath(); xb2.moveTo(x0 + k * 4.5, y0 - 3); xb2.lineTo(x0 + k * 4.5 + 1, y0 + 3); xb2.stroke(); } }
      const texB = tex(cb2);
      const matBoneco = mat({ map: texB, bumpMap: texB, bumpScale: .004, roughness: .55 });
      const matJunta = mat({ color: '#5a5246', roughness: .4, metalness: .2 });
      const matOco = mat({ color: '#000000', roughness: 1 }), matSangueB = mat({ color: '#2a0806', roughness: .6 });
      const boneco = (h, pai) => {
        const k = h / .8, b = grupo(pai);
        const cabB = grupo(b, 0, -.075 * k, 0), cabM = grupo(cabB);
        malha(cabM, deform(new T.SphereGeometry(.068 * k, 14, 10), (x, y, z) => [x * .9, y * 1.1, z]), matBoneco);
        [-1, 1].forEach(sx => malha(cabM, new T.SphereGeometry(.021 * k, 8, 6), matOco).position.set(sx * .024 * k, .006 * k, .052 * k));
        const bocaB = malha(cabM, new T.SphereGeometry(.013 * k, 8, 6), matOco); bocaB.position.set(0, -.035 * k, .056 * k); bocaB.scale.set(1.6, .55, .6);
        for (let q = 0; q < 4; q++) malha(cabM, new T.CylinderGeometry(.0018 * k, .0018 * k, .022 * k, 4), matSangueB).position.set((q - 1.5) * .007 * k, -.035 * k, .064 * k);
        assar(cabM);
        const tor = grupo(b, 0, -.15 * k, 0);
        malha(tor, casca([[-.29, .07, .05, 0], [-.22, .085, .058, 0], [-.1, .09, .06, 0], [-.02, .1, .06, 0], [.0, .05, .04, 0]].map(([y, w, d, dz]) => [y * k, w * k, d * k, dz * k]), { seg: 14 }), matMacacao);
        malha(tor, new T.CylinderGeometry(.018 * k, .02 * k, .05 * k, 8), matBoneco).position.y = .03 * k;
        const membroB = (x0, y0, L1, L2, r, mt1) => {
          const o = grupo(tor, x0 * k, y0 * k, 0); malha(o, capsulaK(r * k, r * .85 * k, L1 * k), mt1);
          const j = grupo(o, 0, -L1 * k, 0); malha(j, new T.SphereGeometry(r * 1.15 * k, 8, 6), matJunta); malha(j, capsulaK(r * .85 * k, r * .7 * k, L2 * k), matBoneco);
          const p = grupo(j, 0, -L2 * k, 0); malha(p, new T.SphereGeometry(r * 1.05 * k, 8, 6), matBoneco).scale.set(1, 1.5, .7); return { o, j, p };
        };
        const bE = membroB(-.1, -.01, .13, .13, .017, matMacacao), bD = membroB(.1, -.01, .13, .13, .017, matMacacao);
        const pE = membroB(-.045, -.28, .17, .18, .022, matMacacao), pD = membroB(.045, -.28, .17, .18, .022, matMacacao);
        [bE, bD].forEach((m2, i) => { m2.o.rotation.z = (i ? 1 : -1) * .15; m2.j.rotation.x = -.3; });
        [pE, pD].forEach((m2, i) => { m2.o.rotation.x = .1 * (i ? 1 : -1); m2.j.rotation.x = .25; m2.p.rotation.x = .6; });
        return { b, cabB, tor, bE, bD, pE, pD, k };
      };
      const capsulaK = (r1, r2, L) => K.capsula(r1, r2, L, 7, 2);
      const DEF = [[.86, 1.48, .28, .8, 'e'], [1.02, 1.86, -.22, .7, 'e'], [.6, 1.22, .58, .62, 'e'], [-.88, 1.78, .22, .86, 'd'], [-1.02, 1.38, -.24, .7, 'c'], [-.56, 1.12, .6, .64, 'd']];
      const bonecos = DEF.map(([x0, y0, z0, h, ctl], i) => {
        const piv = grupo(g, x0, y0 + .02, z0), bo = boneco(h, piv);
        piv.rotation.y = Math.atan2(-x0, -z0) * .3 + (R() - .5) * .8;
        const mC = grupo(bo.cabB, 0, .068 * bo.k, 0), mE = grupo(bo.bE.p, 0, -.02, 0), mD = grupo(bo.bD.p, 0, -.02, 0);
        return { piv, bo, ctl, mC, mE, mD, f: R() * 6, x0, y0, z0 };
      });
      // fios vermelhos: pontas no titereiro (dedos, batuta) ou no alto, até a cabeça e as mãos de cada boneco
      const dedosE = bracos[1].m.dedos.map(d => grupo(d[d.length - 1], 0, -.03, 0));
      const dedosD = bracos[0].m.dedos.map(d => grupo(d[d.length - 1], 0, -.03, 0));
      const pares = [];
      bonecos.forEach((b, i) => {
        const topo = b.ctl === 'e' ? [dedosE[i % 4], dedosE[(i + 1) % 4], dedosE[(i + 2) % 5]] : b.ctl === 'd' ? [pontaB, dedosD[i % 4], dedosD[(i + 2) % 4]] : [null, null, null];
        [b.mC, b.mE, b.mD].forEach((m2, j) => pares.push({ a: topo[j], b: m2, alto: V(b.x0 + (j - 1) * .08, 3.6, b.z0 + (j - 1) * .05) }));
        pares.push({ a: null, b: b.mC, alto: V(b.x0 * .9, 3.6, b.z0 * .9) });
      });
      [0, 1, 2, 3, 4].forEach(i => pares.push({ a: dedosE[i], b: null, alto: V(.7 + i * .03, 3.6, .1 + (i - 2) * .04) }));
      [0, 2].forEach(i => pares.push({ a: dedosD[i], b: null, alto: V(-.45 + i * .02, 3.6, .2) }));
      const posF = new Float32Array(pares.length * 6), geoF = new T.BufferGeometry(); geoF.setAttribute('position', new T.BufferAttribute(posF, 3));
      const fios = new T.LineSegments(F.guardar(geoF), F.guardar(new T.LineBasicMaterial({ color: new T.Color('#8a1010').convertSRGBToLinear() }))); fios.frustumCulled = false; g.add(fios);
      const PA = V(), PB2 = V();

      /* ---------- animação ---------- */
      let desl = 0, fase = 0, puxaAnt = 0;
      const anim = (dt, t, andando) => {
        desl += ((andando ? 1 : 0) - desl) * Math.min(1, dt * 3);
        // andar de passos longos e arrastados; parado, oscila como quem conduz uma orquestra
        if (andando) fase += dt * 3.2;
        const a = Math.sin(fase) * .5 * desl;
        pernas[0].braco.rotation.x = a; pernas[1].braco.rotation.x = -a;
        pernas[0].cot.rotation.x = Math.max(0, -Math.cos(fase)) * .7 * desl + .05; pernas[1].cot.rotation.x = Math.max(0, Math.cos(fase)) * .7 * desl + .05;
        pernas.forEach(p => { p.bota.rotation.x = -p.cot.rotation.x * .4; });
        corpo.position.y = -Math.abs(Math.sin(fase)) * .04 * desl;
        alto.rotation.x = -.1 + desl * .12 + Math.sin(t * .6) * .02; alto.rotation.z = Math.sin(t * .5) * .03 + Math.sin(fase) * .04 * desl;
        // a batuta desenha um oito no ar, com acentos bruscos
        const ac = Math.pow(Math.max(0, Math.sin(t * 1.4)), 6) * .08;
        ik(bracos[0].br, bracos[0].alvo.clone().add(V(Math.sin(t * .9) * .12, Math.sin(t * 1.8) * .07 - ac, Math.cos(t * .9) * .05)), bracos[0].polo);
        // a mão aberta sobe e desce, os dedos estalam
        const puxa = Math.max(0, Math.sin(t * .8)) * .1 + (Math.sin(t * 2.7) > .9 ? .05 : 0);
        ik(bracos[1].br, bracos[1].alvo.clone().add(V(0, puxa + Math.sin(t * .5) * .03, Math.sin(t * .7) * .04)), bracos[1].polo);
        bracos[1].m.curvar([.15 + Math.sin(t * 3.1) * .12, .1 + Math.sin(t * 2.3 + 1) * .15, .15 + Math.sin(t * 2.9 + 2) * .12, .2 + Math.sin(t * 3.7 + 3) * .15, .1], .03, t);
        bracos[0].m.curvar([.7, .8, .85, .9, .5], .02, t);
        const tranco = Math.max(0, (puxa - puxaAnt) / Math.max(dt, 1e-3)) * .05; puxaAnt = puxa;
        // cabeça jogada para trás, gritando, com espasmos
        const esp = Math.sin(t * 6.1) > .97 ? .2 : 0;
        cab.rotation.set(-.38 + Math.sin(t * .7) * .05 - esp * .5, Math.sin(t * .4) * .15 + esp, Math.sin(t * .55) * .08);
        mand.rotation.x = .7 + Math.sin(t * 1.3) * .12 + esp;
        // casaco: abas balançam e se arrastam
        const pc = casacoM.geometry.attributes.position;
        for (let k = 0; k < pc.count; k++) { const bx = baseC[k * 3], by = baseC[k * 3 + 1], bz = baseC[k * 3 + 2]; if (by > 1.0) continue; const f = 1 - by; const an = Math.atan2(bx, bz); pc.setXYZ(k, bx + Math.sin(t * 1.3 + an * 3 + by * 4) * .015 * f, by, bz + Math.sin(t * 1.1 + an * 4) * .012 * f - desl * .12 * f * f); }
        pc.needsUpdate = true; casacoM.geometry.computeVertexNormals();
        // bonecos: pêndulos que sacodem quando a mão puxa; membros soltos e tiques
        bonecos.forEach((b, i) => {
          const lado = b.ctl === 'e' ? 1 : b.ctl === 'd' ? .6 : .2;
          b.piv.position.y = b.y0 + .02 + (b.ctl === 'e' ? puxa * 1.2 : b.ctl === 'd' ? ac * 1.5 : 0);
          b.piv.rotation.x = Math.sin(t * 1.1 + b.f) * .08 + desl * .15 * Math.sin(t * 2 + b.f);
          b.piv.rotation.z = Math.sin(t * .9 + b.f * 2) * .07;
          const tq = (Math.sin(t * 4.3 + b.f * 3) > .93 ? .5 : 0) + tranco * lado;
          b.bo.bE.o.rotation.x = -.2 - tq + Math.sin(t * 1.7 + b.f) * .1; b.bo.bD.o.rotation.x = -.2 - tq * .7 + Math.sin(t * 1.5 + b.f) * .1;
          b.bo.bE.j.rotation.x = -.3 - tq * .6; b.bo.bD.j.rotation.x = -.3 - tq * .4;
          b.bo.pE.o.rotation.x = Math.sin(t * 1.3 + b.f) * .15 - tq * .3; b.bo.pD.o.rotation.x = Math.sin(t * 1.3 + b.f + 2) * .15;
          b.bo.cabB.rotation.set(.35 + Math.sin(t * .8 + b.f) * .15 + tq * .3, Math.sin(t * .5 + b.f) * .3, Math.sin(t * .6 + b.f) * .25);
        });
        // fios
        pares.forEach((p, i) => {
          if (p.a) posEm(p.a, g, PA); else PA.copy(p.alto);
          if (p.b) posEm(p.b, g, PB2); else PB2.copy(p.alto);
          posF.set([PA.x, PA.y, PA.z, PB2.x, PB2.y, PB2.z], i * 6);
        });
        geoF.attributes.position.needsUpdate = true;
        nuc.pulso(t);
      };
      anim(0, 0, false);
      return { g, alt: 2.5, raioBase: .55, anim };
    },
  };
})();

/* ===== forma: mascara_sorriso ===== */
(() => {
  const NS = window.ACF3D = window.ACF3D || {};
  /* ===== kit de modelagem orgânica (igual em todas as formas, para cada arquivo funcionar sozinho) ===== */
  function kit(F, s) {
    const T = F.T;
    const L = c => new T.Color(c).convertSRGBToLinear();
    // semente a partir do id do ser: vários iguais na mesma sala saem diferentes
    let h = 2166136261; String((s && s.id) || 'x').split('').forEach(ch => { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); });
    const semente = (h >>> 0) % 99991;
    const rngDe = n => { let a = (n * 2654435761) >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
    const rng = rngDe(semente + 7);
    const tela = (w, hh) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; return [c, c.getContext('2d')]; };
    // material PBR guardado (cores escritas como aparecem na tela)
    const mat = (o = {}) => {
      const p = { color: L(o.cor || '#ffffff'), roughness: o.r ?? .7, metalness: o.me ?? 0 };
      if (o.e) { p.emissive = L(o.e); p.emissiveIntensity = o.ei ?? 1; }
      if (o.mapa) p.map = o.mapa; if (o.bump) { p.bumpMap = o.bump; p.bumpScale = o.bs ?? 1; }
      if (o.rMapa) p.roughnessMap = o.rMapa; if (o.emiMapa) p.emissiveMap = o.emiMapa;
      if (o.vc) p.vertexColors = true; if (o.lado) p.side = T.DoubleSide;
      if (o.alfa) p.alphaTest = o.alfa;
      if (o.op !== undefined) { p.transparent = true; p.opacity = o.op; p.depthWrite = false; }
      const m = F.guardar(new T.MeshStandardMaterial(p));
      if (o.flat) m.flatShading = true;
      return m;
    };
    const tex = (c, rep) => F.texCanvas(c, rep || [1, 1]);
    // ruído de valor 3D e fbm (0 a ~0,9)
    const hs = (x, y, z) => { const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + semente * .0131) * 43758.5453; return v - Math.floor(v); };
    const hf = (x, y, z) => { const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return v - Math.floor(v); };
    const sm = t => t * t * (3 - 2 * t);
    const lerp = (a, b, t) => a + (b - a) * t;
    function ruido(x, y, z) {
      const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = sm(x - ix), fy = sm(y - iy), fz = sm(z - iz);
      const a = (i, j, k) => hs(ix + i, iy + j, iz + k);
      return lerp(lerp(lerp(a(0, 0, 0), a(1, 0, 0), fx), lerp(a(0, 1, 0), a(1, 1, 0), fx), fy), lerp(lerp(a(0, 0, 1), a(1, 0, 1), fx), lerp(a(0, 1, 1), a(1, 1, 1), fx), fy), fz);
    }
    const fbm = (x, y, z, n = 3) => { let r = 0, a = .5, f = 1; for (let i = 0; i < n; i++) { r += a * ruido(x * f + i * 17, y * f, z * f); a *= .5; f *= 2.03; } return r; };
    // células (placas): distância à 1ª e à 2ª semente e um id por placa
    function celula(x, y, z) {
      const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z); let f1 = 9, f2 = 9, id = 0;
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
        const cx = ix + i, cy = iy + j, cz = iz + k;
        const dx = cx + hf(cx, cy, cz) - x, dy = cy + hf(cy + 3.1, cz, cx) - y, dz = cz + hf(cz - 7.7, cx, cy) - z, d = dx * dx + dy * dy + dz * dz;
        if (d < f1) { f2 = f1; f1 = d; id = hf(cx * 1.7, cy * 2.3, cz * 3.1); } else if (d < f2) f2 = d;
      }
      return [Math.sqrt(f1), Math.sqrt(f2), id];
    }
    // normais suaves sem costura (vértices na mesma posição dividem a normal)
    function suavizar(geo) {
      geo.computeVertexNormals();
      const p = geo.attributes.position, n = geo.attributes.normal, mapa = new Map();
      for (let i = 0; i < p.count; i++) { const k = p.getX(i).toFixed(4) + ',' + p.getY(i).toFixed(4) + ',' + p.getZ(i).toFixed(4); let a = mapa.get(k); if (!a) { a = []; mapa.set(k, a); } a.push(i); }
      mapa.forEach(a => { if (a.length < 2) return; let x = 0, y = 0, z = 0; a.forEach(i => { x += n.getX(i); y += n.getY(i); z += n.getZ(i); }); const l = Math.hypot(x, y, z) || 1; a.forEach(i => n.setXYZ(i, x / l, y / l, z / l)); });
      return geo;
    }
    // cor por vértice (função da posição) para poder juntar e sombrear regiões
    function pintar(geo, fn) {
      const p = geo.attributes.position, c = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const v = typeof fn === 'function' ? fn(p.getX(i), p.getY(i), p.getZ(i)) : fn; c[i * 3] = v[0]; c[i * 3 + 1] = v[1]; c[i * 3 + 2] = v[2]; }
      geo.setAttribute('color', new T.BufferAttribute(c, 3)); return geo;
    }
    const BRANCO = [1, 1, 1];
    // junta várias geometrias indexadas em uma (menos chamadas de desenho)
    function juntar(geos) {
      geos = geos.filter(Boolean).map(g => { if (!g.index) { const n = g.attributes.position.count, ix = []; for (let i = 0; i < n; i++) ix.push(i); g.setIndex(ix); } if (!g.attributes.color) pintar(g, BRANCO); if (!g.attributes.uv) g.setAttribute('uv', new T.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); if (!g.attributes.normal) g.computeVertexNormals(); return g; });
      let nv = 0, ni = 0; geos.forEach(g => { nv += g.attributes.position.count; ni += g.index.count; });
      const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), C = new Float32Array(nv * 3), I = new (nv > 65535 ? Uint32Array : Uint16Array)(ni);
      let ov = 0, oi = 0;
      geos.forEach(g => { const c = g.attributes.position.count; P.set(g.attributes.position.array, ov * 3); N.set(g.attributes.normal.array, ov * 3); U.set(g.attributes.uv.array, ov * 2); C.set(g.attributes.color.array, ov * 3); const ix = g.index.array; for (let i = 0; i < ix.length; i++) I[oi + i] = ix[i] + ov; ov += c; oi += ix.length; g.dispose(); });
      const r = new T.BufferGeometry(); r.setAttribute('position', new T.BufferAttribute(P, 3)); r.setAttribute('normal', new T.BufferAttribute(N, 3)); r.setAttribute('uv', new T.BufferAttribute(U, 2)); r.setAttribute('color', new T.BufferAttribute(C, 3)); r.setIndex(new T.BufferAttribute(I, 1));
      return r;
    }
    // aplica posição/rotação/escala numa geometria (para juntar peças já no lugar)
    const _o = new T.Object3D();
    function por(geo, pos = [0, 0, 0], rot = [0, 0, 0], esc = [1, 1, 1]) { _o.position.set(...pos); _o.rotation.set(...rot); _o.scale.set(...(Array.isArray(esc) ? esc : [esc, esc, esc])); _o.updateMatrix(); geo.applyMatrix4(_o.matrix); return geo; }
    function malha(pai, geo, m, pos, rot) { const me = new T.Mesh(F.guardar(geo), m); if (pos) me.position.set(...pos); if (rot) me.rotation.set(...rot); pai.add(me); return me; }
    function junta(pai, x = 0, y = 0, z = 0) { const j = new T.Group(); j.position.set(x, y, z); pai.add(j); return j; }

    /* tubo orgânico que passa pelos pontos pts ([x,y,z]); raios: números ou [largura, profundidade] ao longo.
       o: { nr, nl, ref, ruido, fq, deform(q, dir, t, a) → deslocamento, cor(q, t, a) → [r,g,b] ou cor fixa,
       ini, fim (pontas arredondadas: fração do raio; negativo = sem tampa), uvV (repetição ao longo) } */
    function tubo(pts, raios, o = {}) {
      const nr = o.nr || 10, nl = o.nl || Math.max(6, pts.length * 4);
      const V = pts.map(p => new T.Vector3(p[0], p[1], p[2]));
      const curva = V.length === 2 ? new T.LineCurve3(V[0], V[1]) : new T.CatmullRomCurve3(V, false, 'centripetal');
      const ref = new T.Vector3(...(o.ref || [0, 0, 1]));
      const RR = raios.map(r => Array.isArray(r) ? r : [r, r]);
      const R = t => { if (RR.length === 1) return RR[0]; const k = t * (RR.length - 1), i = Math.min(RR.length - 2, Math.floor(k)), f = sm(k - i); return [lerp(RR[i][0], RR[i + 1][0], f), lerp(RR[i][1], RR[i + 1][1], f)]; };
      const pos = [], uv = [], idx = [], col = [];
      const P = new T.Vector3(), Tg = new T.Vector3(), Lx = new T.Vector3(), Lz = new T.Vector3(), q = new T.Vector3(), dir = new T.Vector3();
      const fq = o.fq || 9, aneis = [];
      const corF = !o.cor ? null : typeof o.cor === 'function' ? o.cor : () => o.cor;
      for (let i = 0; i <= nl; i++) {
        const t = i / nl; curva.getPointAt(t, P); curva.getTangentAt(t, Tg);
        Lx.crossVectors(Tg, ref); if (Lx.lengthSq() < 1e-8) Lx.set(1, 0, 0); Lx.normalize(); Lz.crossVectors(Lx, Tg).normalize();
        const [rx, rz] = R(t); aneis.push([P.clone(), Tg.clone(), Math.max(rx, rz)]);
        for (let j = 0; j <= nr; j++) {
          const a = (j / nr - .5) * Math.PI * 2, sa = Math.sin(a), ca = Math.cos(a);
          q.copy(P).addScaledVector(Lx, sa * rx).addScaledVector(Lz, ca * rz);
          dir.copy(Lx).multiplyScalar(sa * rz).addScaledVector(Lz, ca * rx).normalize();
          let d = 0;
          if (o.ruido) d += (fbm(q.x * fq + 3, q.y * fq, q.z * fq) - .44) * o.ruido;
          if (o.deform) d += o.deform(q, dir, t, a) || 0;
          q.addScaledVector(dir, d);
          pos.push(q.x, q.y, q.z); uv.push(j / nr, t * (o.uvV || 1));
          const c = corF ? corF(q, t, a) : BRANCO; col.push(c[0], c[1], c[2]);
        }
      }
      const W = nr + 1;
      for (let i = 0; i < nl; i++) for (let j = 0; j < nr; j++) { const a = i * W + j, b = a + W; idx.push(a, a + 1, b, b, a + 1, b + 1); }
      // tampas arredondadas (polo empurrado para fora)
      const tampa = (anel, k, sinal) => {
        if (k < 0) return; const [Pc, Tc, r] = aneis[anel]; const pp = Pc.clone().addScaledVector(Tc, sinal * r * k);
        const c = corF ? corF(pp, anel ? 1 : 0, 0) : BRANCO; const iv = pos.length / 3; pos.push(pp.x, pp.y, pp.z); uv.push(.5, anel ? (o.uvV || 1) : 0); col.push(c[0], c[1], c[2]);
        for (let j = 0; j < nr; j++) { const a = anel * W + j; if (sinal > 0) idx.push(a, a + 1, iv); else idx.push(a + 1, a, iv); }
      };
      tampa(0, o.ini ?? .5, -1); tampa(nl, o.fim ?? .5, 1);
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx);
      return suavizar(g);
    }
    // elipsoide deformado: def(x,y,z na esfera unitária) → [x,y,z]; ruído opcional
    function bolha(rx, ry, rz, o = {}) {
      const g = new T.SphereGeometry(1, o.ws || 20, o.hs || 14), p = g.attributes.position, fq = o.fq || 3;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        if (o.def) [x, y, z] = o.def(x, y, z);
        let k = 1; if (o.ruido) k += (fbm(x * fq + 5, y * fq, z * fq) - .44) * o.ruido;
        p.setXYZ(i, x * rx * k, y * ry * k, z * rz * k);
      }
      if (o.cor) pintar(g, typeof o.cor === 'function' ? (x, y, z) => o.cor({ x, y, z }) : o.cor); return suavizar(g);
    }
    // cones (dentes, garras, espinhos) juntos: lista de [pos, dir, comp, raio]
    function espinhos(lista, o = {}) {
      const geos = lista.map(([p, d, comp, r]) => { const g = new T.ConeGeometry(r, comp, o.lados || 5, 1); g.translate(0, comp / 2, 0); const v = new T.Vector3(...d).normalize(); g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), v)); g.translate(...p); pintar(g, o.c || BRANCO); return g; });
      return juntar(geos);
    }
    /* núcleo roxo no peito: esfera brilhante numa moldura escura de espinhos (como aranha) */
    function nucleo(pai, r, pos, rot, o = {}) {
      const g = junta(pai, ...pos); if (rot) g.rotation.set(...rot);
      const mN = mat({ cor: '#2a0844', e: '#8f2bff', ei: 1.4, r: .15, me: .1 });
      const esf = malha(g, new T.SphereGeometry(r, 20, 14), mN, [0, 0, r * .25]);
      const brilho = F.guardar(new T.MeshBasicMaterial({ color: L('#7a20ff'), transparent: true, opacity: .28, blending: T.AdditiveBlending, depthWrite: false }));
      const halo = malha(g, new T.SphereGeometry(r * 1.9, 16, 12), brilho, [0, 0, r * .4]);
      const mM = mat({ cor: '#140a10', r: .35, me: .45 });
      const pecas = [por(new T.TorusGeometry(r * 1.18, r * .2, 6, 24), [0, 0, r * .1])];
      const n = o.pernas || 8;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + .2, ca = Math.cos(a), sa = Math.sin(a), R1 = r * 1.2, R2 = r * (2.1 + (i % 2) * .5), R3 = r * (2.9 + (i % 3) * .4);
        pecas.push(tubo([[ca * R1, sa * R1, r * .15], [ca * R2, sa * R2, r * .55], [ca * R3, sa * R3, -r * .1]], [r * .13, r * .1, r * .02], { nr: 5, nl: 6, fim: 1.5 }));
      }
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; pecas.push(por(new T.ConeGeometry(r * .1, r * .55, 4), [Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3, r * .35], [0, 0, a - Math.PI / 2])); }
      malha(g, juntar(pecas), mM);
      const pulso = (t, extra = 0) => { const k = .5 + .5 * Math.sin(t * 1.3) * Math.sin(t * .37 + 1); mN.emissiveIntensity = .9 + k * 1.3 + extra; brilho.opacity = .1 + k * .2; halo.scale.setScalar(.85 + k * .35); };
      return { g, pulso, mat: mN };
    }
    return { T, L, mat, tex, tela, rng, rngDe, semente, ruido, fbm, celula, hs, hf, sm, lerp, suavizar, pintar, juntar, por, malha, junta, tubo, bolha, espinhos, nucleo };
  }
  /* Homem alto e magro de máscara pálida sorridente (olhos fechados), cabelo castanho bagunçado, cachecol
     vermelho, camisa larga com suspensórios, calça folgada, botas gastas e dedos pálidos compridos demais.
     Tamanho de gente (1,95 m) e modelo limpo. Educação inquietante: cabeça inclinada e um aceno lento dos dedos. */
  (NS.formasFilho = NS.formasFilho || {}).mascara_sorriso = {
    nome: 'Máscara sorridente (homem de cachecol)',
    criar: (F, s) => {
      const K = kit(F, s), { T, L, mat, tubo, bolha, malha, junta, juntar, por, pintar, fbm, sm } = K;
      const g = new T.Group(), r2 = K.rngDe(733);

      /* ---------- texturas de pano, couro, pele e a máscara ---------- */
      const pano = (base, fio, manchas, tam = 256, listra = 0) => {
        const [c, x] = K.tela(tam, tam); x.fillStyle = base; x.fillRect(0, 0, tam, tam);
        for (let i = 0; i < tam; i += 2) { x.fillStyle = `rgba(${fio},${.05 + r2() * .06})`; x.fillRect(0, i, tam, 1); x.fillRect(i, 0, 1, tam); }
        if (listra) for (let i = 0; i < tam; i += listra) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(i, 0, listra * .35, tam); }
        manchas.forEach(([cor, n, rmin, rmax]) => { for (let i = 0; i < n; i++) { const cx = r2() * tam, cy = r2() * tam, rr = rmin + r2() * (rmax - rmin), gr = x.createRadialGradient(cx, cy, 0, cx, cy, rr); gr.addColorStop(0, cor); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(cx - rr, cy - rr, rr * 2, rr * 2); } });
        for (let i = 0; i < tam * 6; i++) { x.fillStyle = `rgba(${r2() < .5 ? '0,0,0' : '255,255,255'},${r2() * .06})`; x.fillRect(r2() * tam, r2() * tam, 1, 1); }
        return c;
      };
      const tCamisa = K.tex(pano('#cbbd9f', '90,70,40', [['rgba(110,85,50,.16)', 12, 10, 40], ['rgba(70,50,30,.12)', 6, 20, 60], ['rgba(110,30,20,.3)', 5, 2, 6]]), [3, 3]);
      const tCalca = K.tex(pano('#5a3024', '20,8,4', [['rgba(20,8,4,.14)', 6, 30, 90], ['rgba(150,110,80,.07)', 5, 30, 80]], 256, 6), [2, 3]);
      const tLenco = K.tex(pano('#8a1a1a', '30,0,0', [['rgba(40,0,0,.4)', 14, 10, 40], ['rgba(200,70,60,.18)', 10, 10, 30]], 256, 8), [4, 2]);
      const tCouro = K.tex(pano('#3e2a1c', '10,5,2', [['rgba(120,90,60,.25)', 16, 4, 20], ['rgba(0,0,0,.4)', 8, 8, 30]]), [2, 2]);
      const tPele = (() => { const [c, x] = K.tela(256, 256); x.fillStyle = '#d6cbbd'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 18; i++) { let px = r2() * 256, py = r2() * 256; x.strokeStyle = 'rgba(90,100,140,.22)'; x.lineWidth = 1 + r2() * 1.5; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 8; j++) { px += (r2() - .5) * 20; py += 10 + r2() * 12; x.lineTo(px, py); } x.stroke(); } for (let i = 0; i < 2000; i++) { x.fillStyle = `rgba(120,90,80,${r2() * .08})`; x.fillRect(r2() * 256, r2() * 256, 1.5, 1.5); } return K.tex(c, [1, 2]); })();
      const mCamisa = mat({ mapa: tCamisa, r: .92, vc: true });
      const mCalca = mat({ mapa: tCalca, r: .95, vc: true });
      const mLenco = mat({ mapa: tLenco, r: .95, vc: true, lado: true });
      const mCouro = mat({ mapa: tCouro, r: .6, vc: true });
      const mPele = mat({ mapa: tPele, r: .55, vc: true });
      const mSusp = mat({ cor: '#2e1c12', r: .55 });
      const mMetal = mat({ cor: '#8a7a5a', r: .35, me: .8 });
      const mCabelo = mat({ cor: '#ffffff', r: .75, vc: true });
      // máscara: porcelana gasta, olhos fechados em arco, sorriso largo com dentes
      const [cm, xm] = K.tela(512, 640);
      {
        const W = 512, H = 640; xm.clearRect(0, 0, W, H);
        xm.save(); xm.beginPath(); xm.ellipse(W / 2, H * .47, W * .47, H * .47, 0, 0, 7); xm.clip();
        const gr = xm.createRadialGradient(W / 2, H * .42, 20, W / 2, H * .5, W * .6); gr.addColorStop(0, '#f1e8da'); gr.addColorStop(.7, '#e2d6c2'); gr.addColorStop(1, '#bfae94'); xm.fillStyle = gr; xm.fillRect(0, 0, W, H);
        for (let i = 0; i < 40; i++) { xm.fillStyle = `rgba(120,100,70,${r2() * .08})`; xm.beginPath(); xm.arc(r2() * W, r2() * H, 5 + r2() * 30, 0, 7); xm.fill(); }
        // bochechas levemente rosadas
        [-1, 1].forEach(sd => { const g2 = xm.createRadialGradient(W / 2 + sd * 130, H * .56, 0, W / 2 + sd * 130, H * .56, 70); g2.addColorStop(0, 'rgba(200,120,110,.22)'); g2.addColorStop(1, 'rgba(200,120,110,0)'); xm.fillStyle = g2; xm.fillRect(0, 0, W, H); });
        // olhos fechados (arcos) e sobrancelhas finas
        xm.strokeStyle = '#2a1a12'; xm.lineCap = 'round';
        [-1, 1].forEach(sd => { const cx = W / 2 + sd * 105, cy = H * .41; xm.lineWidth = 8; xm.beginPath(); xm.arc(cx, cy + 40, 46, Math.PI * 1.22, Math.PI * 1.78); xm.stroke(); xm.lineWidth = 2.5; for (let j = 0; j < 3; j++) { const a = Math.PI * (1.62 + j * .07) * (sd > 0 ? 1 : 1) - (sd < 0 ? Math.PI * .24 : 0); xm.beginPath(); xm.moveTo(cx + Math.cos(a) * 46, cy + 40 + Math.sin(a) * 46); xm.lineTo(cx + Math.cos(a) * 54, cy + 40 + Math.sin(a) * 54); xm.stroke(); } xm.lineWidth = 2.5; xm.strokeStyle = 'rgba(80,60,45,.35)'; xm.beginPath(); xm.arc(cx, cy + 18, 64, Math.PI * 1.32, Math.PI * 1.68); xm.stroke(); xm.strokeStyle = '#2a1a12'; });
        // sorriso: boca escura em crescente, dentes de cima
        const by = H * .66; xm.fillStyle = '#1a0806'; xm.beginPath(); xm.moveTo(W / 2 - 150, by - 22); xm.quadraticCurveTo(W / 2, by + 120, W / 2 + 150, by - 22); xm.quadraticCurveTo(W / 2, by + 40, W / 2 - 150, by - 22); xm.fill();
        xm.save(); xm.clip(); xm.fillStyle = '#e8dfcc'; for (let i = -6; i <= 6; i++) { const tx = W / 2 + i * 21; xm.beginPath(); xm.moveTo(tx - 9, by - 30 + Math.abs(i) * -4); xm.lineTo(tx + 9, by - 30 + Math.abs(i) * -4); xm.lineTo(tx + 8, by + 22 - Math.abs(i) * 5); xm.lineTo(tx - 8, by + 22 - Math.abs(i) * 5); xm.fill(); } xm.restore();
        xm.strokeStyle = '#3a1a12'; xm.lineWidth = 5; xm.beginPath(); xm.moveTo(W / 2 - 160, by - 30); xm.quadraticCurveTo(W / 2, by + 128, W / 2 + 160, by - 30); xm.stroke();
        [-1, 1].forEach(sd => { xm.lineWidth = 4; xm.beginPath(); xm.arc(W / 2 + sd * 168, by - 42, 16, sd > 0 ? Math.PI * .3 : Math.PI * .2, sd > 0 ? Math.PI * .8 : Math.PI * .7); xm.stroke(); });
        // narinas discretas e rachaduras finas
        xm.fillStyle = 'rgba(70,50,40,.5)'; [-1, 1].forEach(sd => { xm.beginPath(); xm.ellipse(W / 2 + sd * 16, H * .555, 7, 4, 0, 0, 7); xm.fill(); });
        const racha = (x0, y0, n) => { let px = x0, py = y0, a = Math.PI / 2 + (r2() - .5); xm.strokeStyle = 'rgba(60,40,30,.6)'; xm.lineWidth = 1.5; for (let i = 0; i < n; i++) { const nx = px + Math.cos(a) * 9, ny = py + Math.sin(a) * 9; xm.beginPath(); xm.moveTo(px, py); xm.lineTo(nx, ny); xm.stroke(); px = nx; py = ny; a += (r2() - .5) * .8; } };
        racha(W * .7, 20, 14); racha(W * .3, H * .9, 8); racha(W * .85, H * .55, 6);
        xm.restore();
      }
      const tMasc = K.tex(cm);
      const mMasc = mat({ mapa: tMasc, r: .38, alfa: .5 });
      mMasc.transparent = false;

      const dobras = (amp, n, fq = 7) => (q, d, t, a) => amp * (Math.sin(a * n + Math.sin(t * 5 + a) * 1.5) * .6 + (fbm(q.x * fq, q.y * fq, q.z * fq) - .45) * 1.2);
      const tomPano = (v0 = 1) => q => { const v = v0 * (.8 + fbm(q.x * 5, q.y * 5, q.z * 5) * .4); return [v, v, v]; };
      const corpo = junta(g, 0, 0, 0);
      const quadril = junta(corpo, 0, 1.0, 0);

      /* ---------- pernas: calça folgada e botas gastas ---------- */
      const pernas = [-1, 1].map(sd => {
        const coxa = junta(quadril, sd * .095, -.02, 0);
        malha(coxa, tubo([[0, .12, 0], [0, -.2, .01], [0, -.47, .0]], [[.115, .11], [.112, .108], [.1, .098]], { nr: 20, nl: 14, deform: dobras(.005, 4), cor: tomPano(1), ini: -1, fim: .6 }), mCalca);
        const joelho = junta(coxa, 0, -.46, 0);
        malha(joelho, tubo([[0, .03, 0], [0, -.2, -.005], [0, -.36, .0], [0, -.4, .01]], [[.1, .098], [.098, .095], [.096, .094], [.1, .1]], { nr: 20, nl: 14, deform: (q, d, t, a) => dobras(.006, 4)(q, d, t, a) + (t > .7 ? .008 * Math.sin(a * 6 + t * 20) : 0), cor: tomPano(.9), ini: .5, fim: -1 }), mCalca);
        const tornozelo = junta(joelho, 0, -.46, -.0);
        const bota = [tubo([[0, .1, -.02], [0, .02, -.01], [0, -.025, .06], [0, -.03, .15]], [[.06, .062], [.058, .065], [.052, .05], [.048, .035]], { nr: 14, nl: 12, cor: q => { const v = .75 + fbm(q.x * 30, q.y * 30, q.z * 30) * .5; return [v, v, v]; }, fim: .6 }),
          pintar(por(new T.BoxGeometry(.11, .022, .27), [0, -.068, .045]), [.35, .3, .28])];
        for (let i = 0; i < 4; i++) bota.push(pintar(por(new T.BoxGeometry(.05, .004, .006), [0, .06 - i * .022, .062 - i * .002 + (i > 2 ? .01 : 0)], [.3, 0, (i % 2 ? .4 : -.4)]), [.2, .17, .14]));
        malha(tornozelo, juntar(bota), mCouro, [0, .04, 0]);
        return { coxa, joelho, tornozelo };
      });

      /* ---------- tronco: camisa larga, cós alto da calça, suspensórios ---------- */
      malha(quadril, tubo([[0, -.12, -.005], [0, .02, 0], [0, .14, .005]], [[.165, .12], [.155, .11], [.15, .105]], { nr: 22, nl: 8, deform: dobras(.005, 6), cor: tomPano(.95), ini: .4, fim: -1 }), mCalca);
      malha(quadril, tubo([[0, .1, 0], [0, .14, .004]], [[.157, .112], [.156, .111]], { nr: 22, nl: 2, cor: [.55, .5, .48], ini: -1, fim: -1 }), mCalca);
      const peito = junta(quadril, 0, .14, 0); peito.rotation.x = .06;
      malha(peito, tubo([[0, -.06, 0], [0, .12, .012], [0, .3, .016], [0, .42, .0], [0, .47, -.01]], [[.14, .1], [.15, .108], [.165, .112], [.148, .095], [.075, .066]], { nr: 30, nl: 20, deform: (q, d, t, a) => dobras(.007, 7, 9)(q, d, t, a) + (Math.cos(a) > .9 && t < .75 ? -.004 : 0), cor: tomPano(1), ini: -1, fim: .4 }), mCamisa);
      // botões e a abertura da camisa
      malha(peito, juntar(Array.from({ length: 5 }, (_, i) => por(new T.CylinderGeometry(.007, .007, .004, 8), [.008, .02 + i * .075, .118 + Math.sin(i / 4 * Math.PI) * .008], [Math.PI / 2, 0, 0]))), mat({ cor: '#d8ccb0', r: .4 }));
      // suspensórios: na frente sobem do cós, cruzam os ombros e fazem um X nas costas
      const susp = [];
      [-1, 1].forEach(sd => {
        susp.push(tubo([[sd * .075, -.04, .118], [sd * .085, .15, .132], [sd * .095, .33, .128], [sd * .1, .43, .06], [sd * .095, .45, -.03], [sd * .07, .34, -.112], [-sd * .02, .18, -.122], [-sd * .07, -.03, -.112]], [[.017, .004]], { nr: 6, nl: 40, ref: [0, 0, 1], ini: -1, fim: -1 }));
        susp.push(por(new T.BoxGeometry(.034, .04, .012), [sd * .075, -.03, .126]));
      });
      malha(peito, juntar(susp), mSusp);
      malha(peito, juntar([-1, 1].map(sd => por(new T.BoxGeometry(.026, .016, .006), [sd * .075, -.008, .134]))), mMetal);
      const nuc = K.nucleo(peito, .022, [.035, .27, .136], [-.05, 0, 0], { pernas: 8 });

      /* ---------- pescoço, cachecol vermelho com franjas ---------- */
      const pesc = junta(peito, 0, .45, -.005); pesc.rotation.x = .12;
      malha(pesc, tubo([[0, -.03, 0], [0, .06, .01], [0, .11, .015]], [.045, .042, .045], { nr: 12, nl: 6, ini: -1 }), mPele);
      const lenco = [];
      for (let v = 0; v < 2; v++) { const pts = []; for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2; pts.push([Math.sin(a) * (.075 + v * .012), .005 + v * .04 + Math.sin(a * 2 + v) * .008, Math.cos(a) * (.07 + v * .01) + .005]); } lenco.push(tubo(pts, [[.032, .024]], { nr: 10, nl: 34, deform: (q, d, t, a) => .004 * Math.sin(a * 3 + t * 30), cor: tomPano(1 - v * .1), ini: -1, fim: -1 })); }
      lenco.push(por(bolha(.04, .035, .03, { ws: 12, hs: 8, ruido: .3, cor: [.9, .9, .9] }), [.035, -.01, .085]));
      malha(pesc, juntar(lenco), mLenco);
      // pontas do cachecol: penduradas na frente, balançam (cadeia de juntas)
      const pontas = [];
      [[.04, .38, .04], [.0, .26, -.05]].forEach(([xx, comp, desv], pi) => {
        let pai = junta(pesc, xx, -.02, .095 + pi * .01); pai.rotation.set(-.08 - pi * .05, 0, desv); const elos = [];
        const nS = 4, l = comp / nS;
        for (let i = 0; i < nS; i++) {
          const ult = i === nS - 1, pecas = [tubo([[0, .01, 0], [0, -l * .5, .002], [0, -l, 0]], [[.04, .007]], { nr: 8, nl: 4, deform: (q, d, t, a) => .002 * Math.sin(a * 2 + i), cor: tomPano(1 - i * .05), ref: [0, 0, 1], ini: -1, fim: -1 })];
          if (ult) for (let f = 0; f < 11; f++) pecas.push(pintar(por(new T.CylinderGeometry(.0025, .0015, .05 + r2() * .02, 4), [(f / 10 - .5) * .075, -l - .028, 0], [(r2() - .5) * .3, 0, (r2() - .5) * .3]), [.85, .85, .85]));
          malha(pai, juntar(pecas), mLenco); elos.push(pai); pai = junta(pai, 0, -l, 0);
        }
        pontas.push(elos);
      });

      /* ---------- cabeça: crânio, máscara sorridente e cabelo bagunçado ---------- */
      const cab = junta(pesc, 0, .11, .015);
      malha(cab, bolha(.083, .105, .095, { ws: 20, hs: 16 }), mPele, [0, .1, -.01]);
      // máscara: plano curvado com nariz, testa e maçãs
      const mg = new T.PlaneGeometry(.17, .215, 26, 32), mp = mg.attributes.position;
      const gss = (x0, y0, cx, cy, sx, sy) => Math.exp(-(((x0 - cx) / sx) ** 2 + ((y0 - cy) / sy) ** 2));
      for (let i = 0; i < mp.count; i++) {
        let x0 = mp.getX(i), y0 = mp.getY(i); const u = x0 / .085, v = y0 / .1075;
        x0 *= 1 - Math.max(0, -v) * .22;
        const z = -u * u * .055 - v * v * .018 + gss(u, v, 0, -.08, .13, .35) * .02 + gss(u, v, 0, .3, .7, .12) * .006 + gss(Math.abs(u), v, .55, -.22, .25, .2) * .007 + gss(u, v, 0, -.42, .5, .12) * .004;
        mp.setXYZ(i, x0, y0, z);
      }
      mg.computeVertexNormals();
      const masc = malha(cab, mg, mMasc, [0, .1, .09]); masc.rotation.x = -.04;
      // cabelo: calota + mechas onduladas
      const cabeloCor = q => { const v = .5 + fbm(q.x * 40, q.y * 40, q.z * 40) * .6; return [L('#5a3a26').r * v * 1.6, L('#5a3a26').g * v * 1.6, L('#5a3a26').b * v * 1.6]; };
      const mechas = [por(bolha(.09, .085, .1, { ws: 22, hs: 14, ruido: .25, fq: 8, cor: cabeloCor, def: (x0, y0, z0) => [x0, y0 < -.2 ? -.2 + (y0 + .2) * .4 : y0, z0] }), [0, .14, -.015])];
      for (let i = 0; i < 120; i++) {
        const th = r2() * Math.PI * 2, ph = .1 + r2() * 1.25, frente = Math.cos(th) > .45;
        if (frente && ph > .5) continue;
        const nx = Math.sin(ph) * Math.sin(th), ny = Math.cos(ph), nz = Math.sin(ph) * Math.cos(th);
        const p0 = [nx * .086, .135 + ny * .088, -.015 + nz * .096], pts = [p0];
        // franja cai sobre a testa da máscara; os lados descem até o queixo emoldurando o rosto
        const L0 = frente ? .07 + r2() * .06 : Math.abs(nx) > .5 ? .14 + r2() * .1 : .12 + r2() * .1;
        const lado = [Math.cos(th), 0, -Math.sin(th)], ond = r2() * 6, amp = .008 + r2() * .014, solto = .006 + r2() * .012;
        for (let j = 1; j <= 6; j++) { const t = j / 6, fora = solto + t * .012 + (ph > .6 ? .008 : 0), cai = t * L0, kz = frente ? .035 * t + .012 : 0; pts.push([p0[0] + nx * fora + lado[0] * Math.sin(t * 6 + ond) * amp, p0[1] - cai * (frente ? .75 : 1) + (ph < .5 ? .01 * Math.sin(t * 3) : 0), p0[2] + nz * fora + kz + lado[2] * Math.sin(t * 6 + ond) * amp]); }
        mechas.push(tubo(pts, [.01 + r2() * .006, .008, .003], { nr: 5, nl: 12, cor: cabeloCor, fim: 1.2 }));
      }
      malha(cab, juntar(mechas), mCabelo);

      /* ---------- braços magros, mangas bufantes e dedos compridos demais ---------- */
      const bracos = [-1, 1].map(sd => {
        const ombro = junta(peito, sd * .16, .39, -.005);
        malha(ombro, tubo([[0, .03, 0], [0, -.15, .012], [0, -.31, .0]], [[.06, .062], [.07, .07], [.066, .066]], { nr: 18, nl: 12, deform: dobras(.004, 4, 8), cor: tomPano(.97), fim: .5 }), mCamisa);
        const cotov = junta(ombro, 0, -.31, 0);
        malha(cotov, juntar([
          tubo([[0, .03, 0], [0, -.14, .01], [0, -.25, .005]], [[.066, .066], [.076, .074], [.062, .058]], { nr: 18, nl: 12, deform: dobras(.005, 5, 8), cor: tomPano(.95), fim: -1 }),
          tubo([[0, -.24, .005], [0, -.29, .004]], [[.042, .04]], { nr: 12, nl: 2, cor: [.85, .85, .85], ini: .2, fim: .2 }),
        ]), mCamisa);
        const pulso = junta(cotov, 0, -.29, .004);
        malha(pulso, tubo([[0, .02, 0], [0, -.04, .003], [0, -.085, .004]], [[.022, .032], [.016, .04], [.014, .038]], { nr: 10, nl: 6, cor: [.95, .92, .9] }), mPele);
        const dedos = [];
        for (let i = 0; i < 5; i++) {
          const pol = i === 4, zz = pol ? .035 : (i - 1.5) * .019, d = junta(pulso, 0, pol ? -.025 : -.082, zz);
          const l = pol ? .11 : .21 - Math.abs(i - 1.2) * .018, cc = -sd, seg = [];
          // três falanges finas, cada uma com junta própria (o aceno ondula pelos dedos)
          let pai = d; const ls = [l * .42, l * .33, l * .25];
          for (let j = 0; j < 3; j++) { const r0 = (.0085 - j * .0012), pts = [[0, .004, 0], [0, -ls[j], 0]]; const pecas = [tubo(pts, [r0, r0 * .9], { nr: 6, nl: 3, cor: [.95, .9, .88], ini: .8, fim: .8 })]; if (j === 2) pecas.push(pintar(por(bolha(.0055, .009, .003, { ws: 6, hs: 5 }), [0, -ls[j] + .005, cc * .006]), [.55, .45, .4])); malha(pai, juntar(pecas), mPele); seg.push(pai); pai = junta(pai, 0, -ls[j], 0); }
          d.userData = { pol, seg }; if (pol) d.rotation.set(.5, 0, -cc * .4); dedos.push(d);
        }
        return { ombro, cotov, pulso, dedos, sd };
      });

      /* ---------- animação: inclinação educada, aceno lento dos dedos, respiração calma, andar macio ---------- */
      const ra = K.rngDe(K.semente + 3), des = ra() * 10;
      let fase = 0, ritmo = 0, incl = .3, alvoIncl = .3, prox = 3;
      const ap = (o, k2, v, vel, dt) => { o[k2] += (v - o[k2]) * Math.min(1, dt * vel); };
      const D = bracos[1], E = bracos[0];
      const anim = (dt, t, andando) => {
        const tt = t + des;
        nuc.pulso(tt);
        peito.scale.set(1 + Math.sin(tt * 1.1) * .01, 1, 1 + Math.sin(tt * 1.1) * .015);
        // a cabeça inclina devagar e às vezes troca de lado, como quem observa com carinho
        prox -= dt; if (prox <= 0) { prox = 3 + ra() * 4; alvoIncl = (ra() < .7 ? 1 : -1) * (.25 + ra() * .2); }
        incl += (alvoIncl - incl) * Math.min(1, dt * .8);
        cab.rotation.z = incl; cab.rotation.x = .08 + Math.sin(tt * .4) * .03; cab.rotation.y = Math.sin(tt * .25) * .12;
        ritmo += ((andando ? 1 : 0) - ritmo) * Math.min(1, dt * 4);
        if (andando) fase += dt * 3.6;
        const sn = Math.sin(fase), R = ritmo;
        pernas.forEach((p, i) => {
          const s2 = i ? -sn : sn;
          ap(p.coxa.rotation, 'x', -s2 * .38 * R, 10, dt);
          ap(p.joelho.rotation, 'x', Math.max(0, Math.sin(fase + (i ? Math.PI : 0) + 1.4)) * .6 * R + .03, 10, dt);
          ap(p.tornozelo.rotation, 'x', s2 * .15 * R, 10, dt);
        });
        corpo.position.y = -R * Math.abs(Math.cos(fase)) * .012;
        corpo.rotation.z = R * sn * .02;
        peito.rotation.y = -R * sn * .06;
        // mão direita erguida num aceno lento; a esquerda pende com os dedos abertos
        ap(D.ombro.rotation, 'x', -.35, 4, dt); ap(D.ombro.rotation, 'z', .55 + Math.sin(tt * .6) * .04, 4, dt);
        ap(D.cotov.rotation, 'x', -1.75 + Math.sin(tt * .6) * .06, 4, dt); D.cotov.rotation.y = .4;
        D.pulso.rotation.set(-.2 + Math.sin(tt * .9) * .1, -1.2, .15);
        D.dedos.forEach((d, i) => { const onda = Math.max(0, Math.sin(tt * 1.6 - i * .55)); d.userData.seg.forEach((sg, j) => { sg.rotation.z = d.userData.pol ? .15 : -(-.1 + onda * (.35 + j * .2)); }); if (!d.userData.pol) d.rotation.x = (i - 1.5) * (.16 + onda * .05); });
        ap(E.ombro.rotation, 'x', R * sn * .25 + (1 - R) * Math.sin(tt * .5) * .02, 5, dt); ap(E.ombro.rotation, 'z', -.07, 5, dt);
        ap(E.cotov.rotation, 'x', -.12 - R * .1, 5, dt);
        E.dedos.forEach((d, i) => { d.userData.seg.forEach((sg, j) => { sg.rotation.z = d.userData.pol ? .1 : (.05 + j * .08 + Math.sin(tt * .7 + i) * .05) * 1; }); if (!d.userData.pol) d.rotation.x = (i - 1.5) * .17; });
        // pontas do cachecol balançam
        pontas.forEach((el, pi) => el.forEach((e, j) => { e.rotation.x = (j ? 0 : -.08 - pi * .05) + Math.sin(tt * 1.3 - j * .7 + pi) * (.03 + R * .12) - R * .15 * (j ? 0 : 1); e.rotation.z = (j ? 0 : [.04, -.05][pi]) + Math.sin(tt * .9 - j * .5 + pi * 2) * .03; }));
      };
      anim(0, 0, false);
      const caixa = new T.Box3().setFromObject(g);
      return { g, alt: +caixa.max.y.toFixed(2), raioBase: .36, anim };
    },
  };
})();

/* ===== forma: moldura ===== */
/* Forma de Filho: figura de terno podre com uma moldura dourada no lugar da cabeça.
   Terno e sobretudo marrom-dourado apodrecido, escorrendo e em farrapos; mãos de garra abertas;
   a moldura barroca guarda uma foto antiga de aniversário de família (pintura inventada) cujas pessoas
   sorriem com os olhos sangrando. A pintura muda: os olhos se mexem juntos, os sorrisos crescem. */
(() => {
  const NS = window.ACF3D = window.ACF3D || {};

  // utilidades de modelagem (cada forma traz as suas, para o arquivo ser independente)
  function kit(F, sem) {
    const T = F.T, gd = F.guardar, R = F.rng(sem), V = (x, y, z) => new T.Vector3(x, y, z);
    const nz = (x, y, z) => Math.sin(x * 3.1 + Math.sin(y * 2.3 + z)) * Math.cos(y * 2.7 + Math.sin(z * 1.9 + x)) * .6 + Math.sin(z * 4.3 + x * 2.1 + y * 1.3) * .4;
    const malha = (geo, mat, pai, x = 0, y = 0, z = 0) => { const me = new T.Mesh(gd(geo), mat); me.position.set(x, y, z); if (pai) pai.add(me); return me; };
    // normais suaves mesmo na costura da UV (vértices na mesma posição somam as normais)
    function suavizar(geo) {
      geo.computeVertexNormals(); const p = geo.attributes.position, n = geo.attributes.normal, mapa = new Map();
      for (let i = 0; i < p.count; i++) { const k = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`; (mapa.get(k) || mapa.set(k, []).get(k)).push(i); }
      mapa.forEach(l => { if (l.length < 2) return; let x = 0, y = 0, z = 0; l.forEach(i => { x += n.getX(i); y += n.getY(i); z += n.getZ(i); }); const d = Math.hypot(x, y, z) || 1; l.forEach(i => n.setXYZ(i, x / d, y / d, z / d)); });
      return geo;
    }
    function deformar(geo, f, nor = true) { const p = geo.attributes.position, v = new T.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); f(v, i); p.setXYZ(i, v.x, v.y, v.z); } if (nor) suavizar(geo); return geo; }
    // tubo com raio variável ao longo de uma curva (membros, tendões, dedos)
    function tubo(pts, rf, ts = 20, rs = 8, f) {
      const cur = new T.CatmullRomCurve3(pts), geo = new T.TubeGeometry(cur, ts, 1, rs, false);
      const p = geo.attributes.position, c = new T.Vector3(), v = new T.Vector3(); let rm = 0;
      for (let i = 0; i <= ts; i++) { cur.getPointAt(i / ts, c); const r = typeof rf === 'function' ? rf(i / ts) : rf; rm += r;
        for (let j = 0; j <= rs; j++) { const k = i * (rs + 1) + j; v.fromBufferAttribute(p, k).sub(c); const a = j / rs * Math.PI * 2; v.multiplyScalar(r * (f ? 1 + f(i / ts, a) : 1)).add(c); p.setXYZ(k, v.x, v.y, v.z); } }
      const uv = geo.attributes.uv, kk = cur.getLength() / (2 * Math.PI * rm / (ts + 1)); for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * kk);
      if (f) suavizar(geo); return geo;
    }
    const mover = (geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => geo.applyMatrix4(new T.Matrix4().compose(V(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), V(sx, sy, sz)));
    // junta várias geometrias numa só (sem depender de BufferGeometryUtils)
    function juntar(geos) {
      const L = geos.map(g0 => g0.index ? g0.toNonIndexed() : g0); let n = 0; L.forEach(g0 => { n += g0.attributes.position.count; });
      const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0;
      L.forEach(g0 => { const a = g0.attributes; if (!a.normal) g0.computeVertexNormals(); P.set(a.position.array, o * 3); N.set(g0.attributes.normal.array, o * 3); if (a.uv) U.set(a.uv.array, o * 2); o += a.position.count; });
      geos.forEach(g0 => g0.dispose()); L.forEach(g0 => g0.dispose());
      const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(P, 3)); out.setAttribute('normal', new T.BufferAttribute(N, 3)); out.setAttribute('uv', new T.BufferAttribute(U, 2)); return out;
    }
    // núcleo roxo no peito: esfera brilhante numa moldura escura de patas de aranha, com halo
    function nucleo(pai, x, y, z, k = 1, rot = 0) {
      const n = new T.Group(); n.position.set(x, y, z); n.rotation.x = rot; pai.add(n);
      const luz = gd(new T.MeshStandardMaterial({ color: '#3a0a66', emissive: '#8a2be2', emissiveIntensity: 1.6, roughness: .2 }));
      malha(new T.SphereGeometry(.045 * k, 16, 12), luz, n, 0, 0, .012 * k);
      const ferro = gd(new T.MeshStandardMaterial({ color: '#141016', roughness: .45, metalness: .6 }));
      const pecas = [mover(new T.TorusGeometry(.058 * k, .011 * k, 6, 20), 0, 0, .01 * k)];
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .2, c = Math.cos(a), s = Math.sin(a);
        pecas.push(tubo([V(c * .055 * k, s * .055 * k, .01 * k), V(c * .09 * k, s * .09 * k, .03 * k), V(c * .13 * k, s * .13 * k, -.005 * k)], t => (.009 - t * .006) * k, 6, 5)); }
      malha(juntar(pecas), ferro, n);
      const [c, x2] = F.tela(64, 64), gr = x2.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(200,120,255,.9)'); gr.addColorStop(.35, 'rgba(150,60,255,.35)'); gr.addColorStop(1, 'rgba(120,40,255,0)'); x2.fillStyle = gr; x2.fillRect(0, 0, 64, 64);
      const halo = new T.Sprite(gd(new T.SpriteMaterial({ map: F.texCanvas(c), blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: .8 }))); halo.scale.setScalar(.32 * k); halo.position.z = .03 * k; n.add(halo);
      return { pulso: t => { const p = .5 + .5 * Math.sin(t * 1.3) * Math.sin(t * .37 + 1); luz.emissiveIntensity = 1.1 + p * .9; halo.material.opacity = .45 + p * .45; halo.scale.setScalar((.28 + p * .08) * k); } };
    }
    return { T, gd, R, V, nz, malha, suavizar, deformar, tubo, mover, juntar, nucleo };
  }
  (NS.formasFilho = NS.formasFilho || {}).moldura = {
    nome: 'Moldura (terno podre com uma foto antiga no lugar da cabeça)',
    criar: (F, s) => {
      const K = kit(F, 1201), { T, gd, R, V, nz, malha, deformar, tubo, mover, juntar, nucleo } = K;
      const g = F.G(), corpo = F.G(); g.add(corpo);

      const C = h => new T.Color(h).convertSRGBToLinear(); // cor pensada em sRGB
      /* ---------- texturas ---------- */
      // pano do terno: marrom com manchas de podridão dourada, escorridos e furos (alfa)
      function panoPodre(sem, base, larg, alt, furos) {
        const r = F.rng(sem), [c, x] = F.tela(larg, alt);
        x.fillStyle = base; x.fillRect(0, 0, larg, alt);
        for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '230,190,120'},${r() * .07})`; x.fillRect(r() * larg, r() * alt, 1, 1 + r() * 3); }
        x.strokeStyle = 'rgba(200,160,90,.12)'; x.lineWidth = 1; for (let xx = 0; xx < larg; xx += 9) { x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx, alt); x.stroke(); }
        // podridão dourada em placas (como líquen)
        for (let i = 0; i < 26; i++) { const gx = r() * larg, gy = r() * alt, gr0 = x.createRadialGradient(gx, gy, 2, gx, gy, 30 + r() * 50); gr0.addColorStop(0, 'rgba(150,105,45,.35)'); gr0.addColorStop(1, 'rgba(150,105,45,0)'); x.fillStyle = gr0; x.fillRect(gx - 80, gy - 80, 160, 160); }
        for (let i = 0; i < 160; i++) { const cx = r() * larg, cy = r() * alt, rr = 1.5 + r() * 7; x.fillStyle = `rgba(${140 + r() * 50 | 0},${100 + r() * 30 | 0},${35 + r() * 20 | 0},${.18 + r() * .3})`; x.beginPath(); for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283, q = rr * (.5 + r() * .7); x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } x.fill(); }
        // escorridos para baixo
        for (let i = 0; i < 45; i++) { const x0 = r() * larg, y0 = r() * alt, h = 20 + r() * 90, w = 1 + r() * 3; const gr = x.createLinearGradient(0, y0, 0, y0 + h); const sang = r() < .35; gr.addColorStop(0, sang ? 'rgba(90,10,8,.7)' : 'rgba(150,105,40,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(x0, y0, w, h); x.beginPath(); x.arc(x0 + w / 2, y0 + h * .9, w * .8, 0, 7); x.fill(); }
        for (let i = 0; i < 25; i++) { x.fillStyle = `rgba(20,10,4,${.15 + r() * .25})`; x.beginPath(); x.ellipse(r() * larg, r() * alt, 6 + r() * 30, 4 + r() * 18, r() * 3, 0, 7); x.fill(); }
        let alfa = null;
        if (furos) {
          const [ca, xa] = F.tela(larg, alt); xa.fillStyle = '#fff'; xa.fillRect(0, 0, larg, alt); xa.fillStyle = '#000';
          // barra esfarrapada embaixo (v = 0 é a barra) em tiras compridas
          xa.beginPath(); xa.moveTo(0, alt);
          for (let xx = 0; xx <= larg; xx += 3 + r() * 9) xa.lineTo(xx, alt - (r() < .3 ? alt * (.0 + r() * .03) : alt * (.06 + r() * .18)));
          xa.lineTo(larg, alt); xa.closePath(); xa.fill();
          for (let i = 0; i < furos; i++) { const cx = r() * larg, cy = r() * alt * .75, rr = 3 + r() * 14; xa.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283, q = rr * (.4 + r() * .8); xa.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q * 1.6); } xa.fill(); }
          alfa = F.texCanvas(ca);
        }
        return { mapa: F.texCanvas(c), alfa };
      }
      const pc = panoPodre(17, '#4a3020', 512, 512, 46);
      const casaco = gd(new T.MeshStandardMaterial({ map: pc.mapa, alphaMap: pc.alfa, alphaTest: .5, side: T.DoubleSide, roughness: .85, color: '#7a6450' }));
      const pt = panoPodre(29, '#3a2618', 256, 256, 0);
      const terno = gd(new T.MeshStandardMaterial({ map: pt.mapa, roughness: .8, color: '#7a6858' }));
      const trapo = panoPodre(41, '#5a3a20', 256, 256, 30);
      const farrapo = gd(new T.MeshStandardMaterial({ map: trapo.mapa, alphaMap: trapo.alfa, alphaTest: .5, side: T.DoubleSide, roughness: .85, color: '#806a50' }));
      const camisa = gd(new T.MeshStandardMaterial({ color: '#6a6050', roughness: .8, map: panoPodre(53, '#c8b898', 128, 128, 0).mapa }));
      const couro = gd(new T.MeshStandardMaterial({ color: '#120a06', roughness: .25, metalness: .2 }));
      const pele = gd(new T.MeshStandardMaterial({ color: C('#4a423a'), roughness: .55 }));
      const garra = gd(new T.MeshStandardMaterial({ color: C('#1e1610'), roughness: .2, metalness: .1 }));
      const ponta = gd(new T.MeshStandardMaterial({ color: C('#2a0a06'), roughness: .15 }));
      const sangue = gd(new T.MeshStandardMaterial({ color: C('#4a0606'), roughness: .08, metalness: .3 }));
      const carne = gd(new T.MeshStandardMaterial({ color: '#3a0e0a', roughness: .25, emissive: '#1a0202', emissiveIntensity: .4 }));
      // ouro velho: visível na penumbra (pouco metal, um brilho morno de fundo)
      const [cO, xO] = F.tela(128, 128); xO.fillStyle = '#6a4a1e'; xO.fillRect(0, 0, 128, 128);
      { const r = F.rng(61); for (let i = 0; i < 900; i++) { xO.fillStyle = r() < .6 ? `rgba(40,25,5,${r() * .35})` : `rgba(255,230,150,${r() * .3})`; xO.fillRect(r() * 128, r() * 128, 1 + r() * 2, 1 + r() * 2); } for (let i = 0; i < 26; i++) { xO.fillStyle = `rgba(${r() < .5 ? '40,30,10' : '60,70,30'},${.15 + r() * .25})`; xO.beginPath(); xO.arc(r() * 128, r() * 128, 4 + r() * 12, 0, 7); xO.fill(); } }
      const ouro = gd(new T.MeshStandardMaterial({ map: F.texCanvas(cO, [3, 3]), metalness: .6, roughness: .5, emissive: '#3a2206', emissiveIntensity: .22 }));
      const madeira = gd(new T.MeshStandardMaterial({ color: '#1a100a', roughness: .9 }));

      /* ---------- a foto de família (pintura inventada que muda) ---------- */
      const PW = 512, PH = 352, [cQ, xQ] = F.tela(PW, PH), texQ = F.texCanvas(cQ);
      const rQ = F.rng(71), manchas = Array.from({ length: 40 }, () => [rQ() * PW, rQ() * PH, 3 + rQ() * 30, rQ()]);
      const riscos = Array.from({ length: 30 }, () => [rQ() * PW, rQ() * PH, (rQ() - .5) * 120, (rQ() - .5) * 80]);
      // pessoas: x, y da cabeça, escala, cabelo, roupa
      const gente = [
        { x: 105, y: 128, k: 1.05, cab: 'coque', roupa: '#b8a888', pele: '#b89878' },
        { x: 232, y: 150, k: .78, cab: 'curto', roupa: '#6a5438', pele: '#c0a080' },
        { x: 372, y: 104, k: 1.15, cab: 'barba', roupa: '#2a2018', pele: '#a88868' },
        { x: 430, y: 196, k: .72, cab: 'tranca', roupa: '#905848', pele: '#c4a484' },
      ];
      const [cRach, xRach] = F.tela(PW, PH); xRach.strokeStyle = 'rgba(20,10,4,.35)'; xRach.lineWidth = .7;
      for (let i = 0; i < 220; i++) { let a = rQ() * PW, b = rQ() * PH; xRach.beginPath(); xRach.moveTo(a, b); for (let k = 0; k < 3; k++) { a += (rQ() - .5) * 26; b += (rQ() - .5) * 26; xRach.lineTo(a, b); } xRach.stroke(); }
      function pintar(e) {
        const x = xQ;
        // parede e luz de vela
        const gF = x.createRadialGradient(256, 250, 20, 256, 200, 340); gF.addColorStop(0, '#6a5038'); gF.addColorStop(1, '#1e140c'); x.fillStyle = gF; x.fillRect(0, 0, PW, PH);
        x.strokeStyle = 'rgba(30,18,8,.25)'; x.lineWidth = 2; for (let xx = 10; xx < PW; xx += 28) { x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx, 240); x.stroke(); }
        // pessoas
        gente.forEach((p, i) => {
          const k = p.k, vira = e.vira === i ? e.viraA : 0;
          x.save(); x.translate(p.x, p.y);
          x.fillStyle = p.roupa; x.beginPath(); x.moveTo(-60 * k, 200); x.quadraticCurveTo(-58 * k, 52 * k, 0, 46 * k); x.quadraticCurveTo(58 * k, 52 * k, 60 * k, 200); x.fill();
          if (p.cab === 'barba') { x.fillStyle = '#e8e0d0'; x.beginPath(); x.moveTo(-12 * k, 48 * k); x.lineTo(0, 90 * k); x.lineTo(12 * k, 48 * k); x.fill(); x.fillStyle = '#3a1010'; x.fillRect(-4 * k, 52 * k, 8 * k, 40 * k); }
          x.fillStyle = p.pele; x.fillRect(-9 * k, 26 * k, 18 * k, 24 * k);
          x.rotate(vira * .5); x.translate(vira * 6, 0);
          // cabelo de trás
          x.fillStyle = '#2a1a10';
          if (p.cab === 'coque') { x.beginPath(); x.arc(0, -36 * k, 16 * k, 0, 7); x.fill(); x.beginPath(); x.ellipse(0, -6 * k, 33 * k, 38 * k, 0, 0, 7); x.fill(); }
          if (p.cab === 'tranca') { x.beginPath(); x.ellipse(-30 * k, 18 * k, 9 * k, 26 * k, .3, 0, 7); x.ellipse(30 * k, 18 * k, 9 * k, 26 * k, -.3, 0, 7); x.fill(); }
          // rosto
          x.fillStyle = p.pele; x.beginPath(); x.ellipse(0, 0, 27 * k, 34 * k, 0, 0, 7); x.fill();
          const gS = x.createRadialGradient(-6 * k, -8 * k, 4, 0, 0, 34 * k); gS.addColorStop(0, 'rgba(255,240,220,.15)'); gS.addColorStop(1, 'rgba(40,20,10,.35)'); x.fillStyle = gS; x.fill();
          x.fillStyle = '#2a1a10';
          if (p.cab === 'barba') { x.beginPath(); x.ellipse(0, 18 * k, 26 * k, 22 * k, 0, 0, Math.PI); x.fill(); x.beginPath(); x.ellipse(0, -28 * k, 28 * k, 12 * k, 0, Math.PI, 0); x.fill(); }
          else { x.beginPath(); x.ellipse(0, -24 * k, 29 * k, 16 * k, 0, Math.PI * .95, Math.PI * 2.05); x.fill(); }
          // olhos: buracos pretos que choram sangue, com um brilho que se move
          [-1, 1].forEach(sx => {
            const ex = sx * 10 * k, ey = -4 * k;
            x.fillStyle = '#5a0606'; const lag = (10 + e.lagrima * 26 + i * 3) * k; x.fillRect(ex - 2 * k, ey, 4 * k, lag); x.beginPath(); x.arc(ex, ey + lag, 2.6 * k, 0, 7); x.fill();
            x.fillStyle = '#050202'; x.beginPath(); x.ellipse(ex, ey, 6.5 * k, 5 * k * (e.pisca === i ? .15 : 1), 0, 0, 7); x.fill();
            x.fillStyle = '#ffe8d0'; x.beginPath(); x.arc(ex + e.olhoX * 3 * k, ey + e.olhoY * 2 * k, 1.5 * k, 0, 7); x.fill();
          });
          // sorriso largo demais
          const sw = (13 + e.sorriso * 9) * k, sh = (5 + e.sorriso * 7) * k;
          x.fillStyle = '#1a0505'; x.beginPath(); x.moveTo(-sw, 12 * k); x.quadraticCurveTo(0, 12 * k + sh * 2.2, sw, 12 * k); x.quadraticCurveTo(0, 12 * k + sh * .6, -sw, 12 * k); x.fill();
          x.strokeStyle = '#e8dcc0'; x.lineWidth = 1; for (let d = -sw + 3; d < sw - 2; d += 3.2 * k) { x.beginPath(); x.moveTo(d, 13 * k + sh * .3 * (1 - Math.abs(d / sw))); x.lineTo(d, 15 * k + sh * .9 * (1 - Math.abs(d / sw))); x.stroke(); }
          x.restore();
        });
        // mesa com toalha e bolo com velas
        x.fillStyle = '#9a8a70'; x.fillRect(0, 262, PW, 90); x.fillStyle = 'rgba(40,25,10,.3)'; for (let xx = 0; xx < PW; xx += 22) x.fillRect(xx, 262, 2, 90);
        x.fillStyle = '#e8dcc4'; x.beginPath(); x.ellipse(256, 262, 62, 16, 0, 0, 7); x.fill(); x.fillRect(194, 226, 124, 36); x.beginPath(); x.ellipse(256, 226, 62, 16, 0, 0, 7); x.fillStyle = '#f4ead8'; x.fill();
        x.fillStyle = '#8a1010'; for (let i = 0; i < 8; i++) { x.beginPath(); x.arc(200 + i * 16, 238 + (i % 2) * 6, 3, 0, 7); x.fill(); }
        for (let i = 0; i < 5; i++) { const vx = 222 + i * 17, vy = 222 - (i % 2) * 4; x.fillStyle = '#d8c8f0'; x.fillRect(vx - 2, vy - 22, 4, 22);
          const ch = e.chama[i]; const gC = x.createRadialGradient(vx, vy - 28, 1, vx, vy - 28, 16 * ch); gC.addColorStop(0, 'rgba(255,240,180,1)'); gC.addColorStop(.3, 'rgba(255,170,60,.7)'); gC.addColorStop(1, 'rgba(255,120,20,0)'); x.fillStyle = gC; x.fillRect(vx - 18, vy - 46, 36, 36);
          x.fillStyle = '#fff6d0'; x.beginPath(); x.ellipse(vx, vy - 28, 2.4, 6 * ch, 0, 0, 7); x.fill(); }
        // tom sépia, desgaste, sangue
        x.fillStyle = 'rgba(110,70,30,.28)'; x.fillRect(0, 0, PW, PH);
        manchas.forEach(([a, b, rr, q]) => { x.fillStyle = q < .3 ? `rgba(80,6,4,${.25 + q})` : `rgba(30,18,8,${q * .25})`; x.beginPath(); x.arc(a, b, rr, 0, 7); x.fill(); });
        x.strokeStyle = 'rgba(230,210,170,.25)'; x.lineWidth = 1; riscos.forEach(([a, b, c2, d]) => { x.beginPath(); x.moveTo(a, b); x.lineTo(a + c2, b + d); x.stroke(); });
        const gV = x.createRadialGradient(256, 176, 120, 256, 176, 330); gV.addColorStop(0, 'rgba(0,0,0,0)'); gV.addColorStop(1, 'rgba(10,4,2,.85)'); x.fillStyle = gV; x.fillRect(0, 0, PW, PH);
        for (let i = 0; i < 6; i++) { const x0 = 40 + i * 85, h = 30 + ((i * 37) % 60) + e.lagrima * 40; x.fillStyle = 'rgba(70,4,4,.75)'; x.fillRect(x0, 0, 4, h); x.beginPath(); x.arc(x0 + 2, h, 4, 0, 7); x.fill(); }
        x.drawImage(cRach, 0, 0);
        texQ.needsUpdate = true;
      }
      const est = { olhoX: 0, olhoY: 0, sorriso: .3, lagrima: 0, pisca: -1, vira: -1, viraA: 0, chama: [1, 1, 1, 1, 1] };
      pintar(est);

      /* ---------- pernas e sapatos ---------- */
      const quadril = 1.0, pernas = [];
      [-1, 1].forEach(sx => {
        const p = F.G(); p.position.set(sx * .1, quadril, 0); p.rotation.z = sx * .05; corpo.add(p);
        malha(tubo([V(0, .05, 0), V(0, -.25, .015), V(sx * .01, -.5, .03), V(sx * .015, -.72, .0), V(sx * .02, -.9, -.01)], t => .085 - .02 * t, 24, 12, (t, a) => .05 * Math.sin(a * 2 + t * 7) * t + .04 * Math.sin(t * 30) * Math.max(0, t - .7)), terno, p);
        const sap = deformar(mover(new T.SphereGeometry(.06, 16, 10), sx * .02, -.955, .055, 0, 0, 0, .78, .55, 2.15), v => { if (v.y < -.97) v.y = -.97; if (v.z > .12) v.y += (v.z - .12) * .3; });
        const sola = mover(new T.BoxGeometry(.1, .025, .27), sx * .02, -.985, .05);
        malha(juntar([sap, sola]), couro, p);
        pernas.push({ p, sx });
      });

      /* ---------- tronco: colete, camisa, gravata, sobretudo ---------- */
      const tronco = F.G(); tronco.position.set(0, quadril, 0); tronco.rotation.x = -.03; corpo.add(tronco);
      const perfilT = [[0, -.05], [.15, -.05], [.155, .1], [.17, .25], [.19, .38], [.2, .46], [.17, .52], [.08, .56], [0, .57]];
      const tr = deformar(mover(new T.LatheGeometry(perfilT.map(([a, b]) => new T.Vector2(a, b)), 28, Math.PI), 0, 0, 0, 0, 0, 0, 1, 1, .62), v => { v.x += nz(v.x * 10, v.y * 10, v.z * 10) * .005; });
      malha(tr, terno, tronco);
      // camisa aberta em V, gravata em laço e botões do colete
      malha(deformar(new T.PlaneGeometry(.12, .2, 4, 6), v => { v.z += -Math.abs(v.x) * .4; v.x *= 1 - (v.y + .1) * 2.2; }), camisa, tronco, 0, .44, .118);
      const laco = []; for (let i = 0; i < 6; i++) laco.push(deformar(mover(new T.SphereGeometry(.03, 8, 6), (R() - .5) * .05, .47 - i * .025, .13, R(), R(), R(), 1.3, .5, .4), v => { v.x += nz(v.x * 60, v.y * 60, i) * .006; }));
      malha(juntar(laco), camisa, tronco);
      const botoes = []; for (let i = 0; i < 4; i++) botoes.push(mover(new T.SphereGeometry(.011, 8, 6), .02, .14 + i * .065, .118 - i * .002));
      malha(juntar(botoes), ouro, tronco);
      // sobretudo longo aberto na frente
      const perfilC = [[.44, -.9], [.36, -.6], [.3, -.35], [.24, -.05], [.215, .15], [.215, .32], [.23, .44], [.215, .52], [.12, .58], [.08, .6]];
      const cG = new T.LatheGeometry(perfilC.map(([a, b]) => new T.Vector2(a, b)), 48, .55, Math.PI * 2 - 1.1);
      deformar(cG, v => { const ang = Math.atan2(v.x, v.z), baixo = Math.max(0, -v.y + .1); const d = 1 + Math.sin(ang * 9 + v.y * 2) * .03 * baixo * 2 + nz(v.x * 6, v.y * 6, v.z * 6) * .015; v.x *= d; v.z *= d * (v.y > 0 ? .7 : .75 + baixo * .15); });
      const casacoM = malha(cG, casaco, tronco);
      // lapelas e gola levantada
      malha(mover(new T.CylinderGeometry(.11, .15, .12, 18, 1, true, Math.PI * .3, Math.PI * 1.4), 0, .6, -.015, 0, Math.PI, 0, 1, 1, .8), casaco, tronco);
      // farrapos pendurados na barra
      const trapos = [];
      for (let i = 0; i < 16; i++) { const a = .7 + i / 15 * (Math.PI * 2 - 1.4), rr = .43 + R() * .03;
        const piv = F.G(); piv.position.set(Math.sin(a) * rr, -.72 - R() * .06, Math.cos(a) * rr * .8); piv.rotation.y = a; tronco.add(piv);
        const h = .18 + R() * .3, w = .04 + R() * .06; const pa = malha(deformar(new T.PlaneGeometry(w, h, 1, 5), v => { v.x *= 1 - (h / 2 - v.y) / h * .7; v.z += Math.pow((h / 2 - v.y) / h, 2) * .05; }), farrapo, piv, 0, -h / 2, 0); pa.rotation.y = Math.PI / 2;
        trapos.push(piv); }

      /* ---------- braços abertos em convite, mãos de garra ---------- */
      const bracos = [], pingos = [];
      // pingo: fio que cresce e cai (escala animada)
      function pingo(pai, x, y, z, comp, mat = sangue) { const p = F.G(); p.position.set(x, y, z); pai.add(p); const w = (R() - .5) * .01; malha(juntar([tubo([V(0, 0, 0), V(w, -.35, w * .5), V(-w * .5, -.7, 0), V(0, -1, 0)], t => .007 - t * .004 + Math.max(0, Math.sin(t * 9)) * .002, 8, 6), mover(new T.SphereGeometry(.012, 8, 6), 0, -.02, 0, 0, 0, 0, 1, .8, 1), mover(new T.SphereGeometry(.008, 8, 6), 0, -1, 0)]), mat, p); p.scale.set(1, comp, 1); pingos.push({ p, comp, f: R() }); return p; }
      [-1, 1].forEach(sx => {
        const b = F.G(); b.position.set(sx * .215, .47, -.01); b.rotation.set(0, 0, sx * .75); tronco.add(b);
        malha(tubo([V(0, .02, 0), V(0, -.18, .01), V(0, -.36, .02)], t => .072 - t * .012, 14, 12, (t, a) => .06 * Math.sin(a * 3 + t * 9)), casaco, b);
        const cot = F.G(); cot.position.set(0, -.36, .02); cot.rotation.set(-.35, 0, -sx * .35); b.add(cot);
        malha(tubo([V(0, .02, 0), V(0, -.17, .02), V(0, -.33, .03)], t => .062 + t * .012, 14, 12, (t, a) => .06 * Math.sin(a * 3 + t * 11)), casaco, cot);
        malha(mover(new T.CylinderGeometry(.052, .05, .05, 14, 1, true), 0, -.35, .03), camisa, cot);
        // tiras penduradas da manga
        for (let i = 0; i < 5; i++) { const piv = F.G(); piv.position.set((R() - .5) * .05, -.08 - i * .06, .03 + (R() - .5) * .04); cot.add(piv); const h = .15 + R() * .22; const pa = malha(deformar(new T.PlaneGeometry(.035 + R() * .03, h, 1, 4), v => { v.x *= 1 - (h / 2 - v.y) / h * .7; }), farrapo, piv, 0, -h / 2, 0); pa.rotation.y = R() * 3; trapos.push(piv); }
        const mao = F.G(); mao.position.set(0, -.38, .03); mao.rotation.set(0, sx * 1.4, 0); mao.scale.setScalar(1.3); cot.add(mao);
        malha(deformar(mover(new T.SphereGeometry(.045, 14, 10), 0, -.05, 0, 0, 0, 0, .85, 1.05, .32), v => { v.z += nz(v.x * 40, v.y * 40, 0) * .003; }), pele, mao);
        const dedos = [];
        for (let i = 0; i < 5; i++) {
          const pol = i === 4, d = F.G(); d.position.set(pol ? sx * .036 : (i - 1.5) * .021 * sx, pol ? -.035 : -.092, 0); d.rotation.set(-.35, 0, pol ? sx * .9 : (i - 1.5) * .28 * sx); mao.add(d);
          const L = pol ? .08 : .13 + (i === 1 ? .025 : 0) - (i === 3 ? .02 : 0);
          malha(juntar([tubo([V(0, 0, 0), V(0, -L * .5, .01), V(0, -L, .03)], t => .0075 - t * .002 + Math.max(0, Math.sin(t * Math.PI * 2)) * .0018, 10, 6), mover(new T.SphereGeometry(.0095, 6, 5), 0, -L * .5, .01), mover(new T.SphereGeometry(.009, 6, 5), 0, 0, 0)]), pele, d);
          // garra comprida curvada
          malha(tubo([V(0, -L, .03), V(0, -L - .035, .055), V(0, -L - .065, .095)], t => .0085 * (1 - t * .5), 6, 6), garra, d);
          malha(tubo([V(0, -L - .065, .095), V(0, -L - .085, .13), V(0, -L - .09, .155)], t => .0045 * (1 - t) + .0004, 5, 5), ponta, d);
          if (R() < .6) pingo(d, 0, -L - .09, .14, .03 + R() * .09);
          dedos.push(d);
        }
        bracos.push({ b, cot, mao, dedos, sx });
      });

      /* ---------- toco do pescoço com veias subindo para a moldura ---------- */
      malha(deformar(new T.SphereGeometry(.07, 14, 10), v => { v.y *= .6; v.x += nz(v.x * 30, v.y * 30, v.z * 30) * .008; }), carne, tronco, 0, .58, 0);
      const veias = []; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; veias.push(tubo([V(Math.cos(a) * .04, .58, Math.sin(a) * .03), V(Math.cos(a) * .07 + (R() - .5) * .03, .63, Math.sin(a) * .03), V(Math.cos(a) * .14 * (R() + .5), .67, -.01), V(Math.cos(a) * .18 * (R() + .5), .69, -.02)], t => .016 - t * .01, 12, 6)); }
      malha(juntar(veias), carne, tronco);

      /* ---------- a moldura barroca ---------- */
      const quadro = F.G(); quadro.position.set(0, .66, .0); tronco.add(quadro);
      const QW = .4, QH = .29, cy0 = .3;
      const ret = (w, h, z = 0) => { const p = []; const c = .03; [[w - c, h], [-w + c, h], [-w, h - c], [-w, -h + c], [-w + c, -h], [w - c, -h], [w, -h + c], [w, h - c]].forEach(([a, b]) => p.push(V(a, cy0 + b, z))); return new T.CatmullRomCurve3(p, true, 'catmullrom', .1); };
      const pecas = [new T.TubeGeometry(ret(QW, QH), 90, .026, 8, true), mover(new T.TubeGeometry(ret(QW - .05, QH - .05), 90, .032, 8, true), 0, 0, 0, 0, 0, 0, 1, 1, .55), new T.TubeGeometry(ret(QW - .095, QH - .095, .01), 80, .013, 6, true)];
      // contas ao longo da moldura e ornamentos
      { const cur = ret(QW - .05, QH - .05, .02); for (let i = 0; i < 56; i++) { const p = cur.getPointAt(i / 56); pecas.push(mover(new T.SphereGeometry(.009, 6, 5), p.x, p.y, p.z)); } }
      const voluta = (x, y, z, r, rz, esp = .012) => pecas.push(mover(new T.TorusGeometry(r, esp, 6, 16, Math.PI * 1.5), x, y, z, 0, 0, rz));
      const folha = (x, y, z, rz, k = 1) => pecas.push(mover(deformar(mover(new T.SphereGeometry(.05 * k, 10, 6), 0, 0, 0, 0, 0, 0, .45, 1, .3), v => { v.z += Math.abs(v.x) * .4; v.x += Math.sin(v.y * 90) * .005; }, false), x, y, z, 0, 0, rz));
      [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([a, b]) => { voluta(a * (QW + .01), cy0 + b * (QH + .01), .02, .045, Math.atan2(b, a) + 2.4); voluta(a * (QW - .03), cy0 + b * (QH + .04), .02, .028, Math.atan2(b, a) + .6, .009); pecas.push(mover(new T.SphereGeometry(.022, 10, 8), a * (QW + .005), cy0 + b * (QH + .005), .03)); });
      for (let i = 0; i < 9; i++) { const a = Math.PI * (i / 8); pecas.push(tubo([V(0, cy0 + QH + .01, .02), V(Math.cos(a) * .06, cy0 + QH + .02 + Math.sin(a) * .06, .03), V(Math.cos(a) * .1, cy0 + QH + .02 + Math.sin(a) * .1, .015)], t => .009 + t * .006, 6, 5)); }
      voluta(-.16, cy0 + QH + .04, .02, .05, 1.2); voluta(.16, cy0 + QH + .04, .02, .05, 1.94 + Math.PI);
      for (let i = 0; i < 5; i++) { const a = Math.PI * (1 + i / 4); pecas.push(tubo([V(0, cy0 - QH - .01, .02), V(Math.cos(a) * .045, cy0 - QH - .01 + Math.sin(a) * .045, .03), V(Math.cos(a) * .07, cy0 - QH - .01 + Math.sin(a) * .07, .015)], t => .008 + t * .005, 6, 5)); }
      [-1, 1].forEach(a => { voluta(a * (QW + .03), cy0, .02, .04, a > 0 ? -.8 : .8 + Math.PI); folha(a * (QW + .04), cy0 + .1, .02, -a * .3); folha(a * (QW + .04), cy0 - .1, .02, Math.PI + a * .3); });
      malha(juntar(pecas), ouro, quadro);
      malha(new T.BoxGeometry(QW * 2 - .02, QH * 2 - .02, .02), madeira, quadro, 0, cy0, -.025);
      malha(tubo([V(-.25, cy0 + .1, -.04), V(0, cy0 + .24, -.045), V(.25, cy0 + .1, -.04)], .003, 16, 4), gd(new T.MeshStandardMaterial({ color: '#555', metalness: .7, roughness: .4 })), quadro);
      const tela = malha(new T.PlaneGeometry((QW - .09) * 2, (QH - .09) * 2), gd(new T.MeshStandardMaterial({ map: texQ, emissiveMap: texQ, emissive: '#ffffff', emissiveIntensity: .16, roughness: .6, color: '#9a9a9a' })), quadro, 0, cy0, -.004);
      // sangue escorrendo da moldura
      for (let i = 0; i < 9; i++) { const xx = (R() - .5) * QW * 1.9; pingo(quadro, xx, cy0 - QH - .015, .02 + R() * .02, .05 + R() * .22); }
      [-1, 1].forEach(a => { pingo(quadro, a * (QW + .02), cy0 - QH + .02, .03, .12 + R() * .15); pingo(quadro, a * (QW + .01), cy0 + .05, .03, .08); });

      /* ---------- núcleo no peito ---------- */
      const nuc = nucleo(tronco, -.1, .38, .12, .6, -.15);

      /* ---------- animação ---------- */
      let fase = 0, tq = 0, tPint = 0, tOlhar = 0, alvoX = 0, alvoY = 0, tPisca = 2, tVira = 6, inclina = .1, alvoInc = .1;
      const anim = (dt, t, andando) => {
        nuc.pulso(t);
        // braços abertos que "acolhem": abrem e fecham devagar, dedos dobrando como quem chama
        const ab = Math.sin(t * .45) * .12;
        bracos.forEach((B, i) => {
          B.b.rotation.z = B.sx * (.75 + ab) + (andando ? Math.sin(fase + i * 3) * .05 : 0);
          B.b.rotation.x = Math.sin(t * .6 + i) * .05;
          B.cot.rotation.z = -B.sx * (.35 - ab * .5);
          B.dedos.forEach((d, j) => { d.rotation.x = -.35 - Math.max(0, Math.sin(t * 1.4 - j * .5 + i * 2)) * .7; });
        });
        // a moldura se inclina como uma cabeça curiosa, às vezes de estalo
        tq -= dt; if (tq <= 0) { tq = 1.5 + R() * 3; alvoInc = (R() - .5) * .5; }
        inclina += (alvoInc - inclina) * Math.min(1, dt * (R() < .08 ? 30 : 2));
        quadro.rotation.z = inclina; quadro.rotation.x = Math.sin(t * .7) * .05; quadro.rotation.y = Math.sin(t * .33) * .12;
        // farrapos e pingos
        trapos.forEach((p, i) => { p.rotation.x = Math.sin(t * 1.6 + i) * (andando ? .25 : .07); p.rotation.z = Math.sin(t * 1.1 + i * 2) * .05; });
        pingos.forEach(P => { P.f += dt * .25; if (P.f > 1) P.f = 0; P.p.scale.y = P.comp * (.3 + P.f * .9); });
        // a pintura muda: olhos que andam juntos, piscadas, sorriso crescendo, alguém vira o rosto, velas tremendo
        tOlhar -= dt; if (tOlhar <= 0) { tOlhar = .8 + R() * 2.5; alvoX = R() < .4 ? 0 : (R() - .5) * 2; alvoY = (R() - .5) * 1.2; }
        est.olhoX += (alvoX - est.olhoX) * Math.min(1, dt * 6); est.olhoY += (alvoY - est.olhoY) * Math.min(1, dt * 6);
        tPisca -= dt; if (tPisca <= 0) { est.pisca = est.pisca >= 0 ? -1 : (R() * 4 | 0); tPisca = est.pisca >= 0 ? .15 : 1 + R() * 3; }
        tVira -= dt; if (tVira <= 0) { if (est.vira >= 0) { est.vira = -1; tVira = 4 + R() * 6; } else { est.vira = R() * 4 | 0; est.viraA = R() < .5 ? -1 : 1; tVira = .6 + R(); } }
        est.sorriso = .35 + .35 * (.5 + .5 * Math.sin(t * .23)) + (est.vira >= 0 ? .3 : 0);
        est.lagrima = (t * .05) % 1;
        tPint -= dt; if (tPint <= 0) { tPint = .14; for (let i = 0; i < 5; i++) est.chama[i] = .75 + R() * .45; pintar(est); }
        if (andando) {
          // passos duros e compridos, ombros quase parados
          fase += dt * 4.5; const a = Math.sin(fase);
          pernas[0].p.rotation.x = a * .42; pernas[1].p.rotation.x = -a * .42;
          corpo.position.y = Math.abs(Math.cos(fase)) * .03; tronco.rotation.y = a * .06; casacoM.rotation.y = -a * .04;
        } else {
          pernas.forEach(P => { P.p.rotation.x *= .9; }); corpo.position.y *= .9; tronco.rotation.y *= .9;
          tronco.rotation.z = Math.sin(t * .4) * .02; casacoM.rotation.y = Math.sin(t * .5) * .015;
        }
        tronco.scale.x = 1 + Math.sin(t * 1.1) * .01;
      };
      return { g, alt: 2.32, raioBase: .5, anim };
    },
  };
})();

/* ===== forma: muitos_bracos ===== */
/* muitos_bracos.js · forma de Filho: mulher alta de sorriso triste e lágrimas, cabelo castanho
   avermelhado, enrolada em tiras de pano vermelho e rosa bordado e em muitos braços humanos pálidos
   que a abraçam de todos os lados; dois braços se estendem para a frente com as mãos abertas.
   Fotografias antigas em sépia (inventadas, sem pessoas reais) presas ao pano.
   Formato: ACF3D.formasFilho.muitos_bracos = { nome, criar(F, s) → { g, alt, raioBase, anim } } */
(() => {
  'use strict';
  const NS = window.ACF3D = window.ACF3D || {};
  /* ---------- kit de modelagem (o mesmo nas formas detalhadas) ---------- */
  function kit(F) {
    const T = F.T, U = T.BufferGeometryUtils, V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
    const vv = p => (p && p.isVector3 ? p : V(p[0], p[1], p[2]));
    // material: as cores são escritas como aparecem na tela (vão para o espaço linear aqui)
    const mat = (p = {}, fisico) => {
      const q = { ...p };
      ['color', 'emissive'].forEach(k => { if (typeof q[k] === 'string') q[k] = new T.Color(q[k]).convertSRGBToLinear(); });
      if (q.duplo) { q.side = T.DoubleSide; delete q.duplo; }
      return F.guardar(fisico ? new T.MeshPhysicalMaterial(q) : new T.MeshStandardMaterial(q));
    };
    const tela = (w, h) => NS.tela(w, h || w);
    const tex = (c, rep) => F.texCanvas(c, rep);
    const malha = (pai, geo, m) => { const me = new T.Mesh(F.guardar(geo), m); pai.add(me); return me; };
    const grupo = (pai, x = 0, y = 0, z = 0) => { const g = new T.Group(); g.position.set(x, y, z); if (pai) pai.add(g); return g; };
    // ruído suave (valor) e fractal, para deformar vértices e pintar texturas
    const fr = v => v - Math.floor(v), h3 = (i, j, k) => fr(Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453);
    const sm = t => t * t * (3 - 2 * t), L = (a, b, t) => a + (b - a) * t;
    function vn(x, y, z) {
      const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), u = sm(x - i), v = sm(y - j), w = sm(z - k);
      const a = L(L(h3(i, j, k), h3(i + 1, j, k), u), L(h3(i, j + 1, k), h3(i + 1, j + 1, k), u), v);
      const b = L(L(h3(i, j, k + 1), h3(i + 1, j, k + 1), u), L(h3(i, j + 1, k + 1), h3(i + 1, j + 1, k + 1), u), v);
      return L(a, b, w) * 2 - 1;
    }
    const fbm = (x, y, z, o = 3) => { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * vn(x * f, y * f, z * f); a *= .5; f *= 2.03; } return s; };
    function deform(geo, fn) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const r = fn(p.getX(i), p.getY(i), p.getZ(i), i); if (r) p.setXYZ(i, r[0], r[1], r[2]); }
      p.needsUpdate = true; geo.computeVertexNormals(); return geo;
    }
    /* casca: superfície de revolução de seção elíptica, anel por anel (de baixo para cima).
       perfil: [[y, largura, profundidade, deslocZ, deslocX]]. A frente (+z) fica em u = 0,5 da textura. */
    function casca(perfil, o = {}) {
      const seg = o.seg || 24, n = perfil.length, pos = [], uv = [], idx = [];
      const ab = o.abertura || 0, ps0 = o.arco ? o.arco[0] : ab ? ab / 2 : Math.PI, pl0 = o.arco ? o.arco[1] : ab ? Math.PI * 2 - ab : Math.PI * 2;
      for (let i = 0; i <= seg; i++) {
        const u = i / seg;
        for (let j = 0; j < n; j++) {
          const p = perfil[j], [ps, pl] = o.arcoY ? o.arcoY(p[0], j) : [ps0, pl0], ph = ps + u * pl;
          let sx = Math.sin(ph), sz = Math.cos(ph);
          if (o.quadrado) { sx = Math.sign(sx) * Math.pow(Math.abs(sx), o.quadrado); sz = Math.sign(sz) * Math.pow(Math.abs(sz), o.quadrado); }
          let x = sx * p[1] + (p[4] || 0), y = p[0], z = sz * p[2] + (p[3] || 0);
          if (o.deform) { const r = o.deform(x, y, z, j, u, Math.atan2(Math.sin(ph), Math.cos(ph))); if (r) [x, y, z] = r; }
          pos.push(x, y, z); uv.push(u, j / (n - 1));
        }
      }
      for (let i = 0; i < seg; i++) for (let j = 0; j < n - 1; j++) { const a = i * n + j, b = (i + 1) * n + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx); geo.computeVertexNormals(); return geo;
    }
    // tubo que afina ao longo de uma curva: raio(t), t de 0 a 1 (u da textura corre ao longo do tubo)
    function tubo(pts, raio, o = {}) {
      const curva = new T.CatmullRomCurve3(pts.map(vv), false, 'catmullrom', o.tensao ?? .5);
      const nS = o.seg || 16, nR = o.rad || 6, geo = new T.TubeGeometry(curva, nS, 1, nR, false);
      const pos = geo.attributes.position, P = V();
      for (let i = 0; i <= nS; i++) {
        curva.getPointAt(i / nS, P); const rr = typeof raio === 'number' ? raio : raio(i / nS);
        for (let j = 0; j <= nR; j++) { const k = i * (nR + 1) + j; pos.setXYZ(k, P.x + (pos.getX(k) - P.x) * rr, P.y + (pos.getY(k) - P.y) * rr, P.z + (pos.getZ(k) - P.z) * rr); }
      }
      geo.computeVertexNormals(); return geo;
    }
    // cápsula pendurada: pivô no topo (y = 0), desce até -comp
    function capsula(r1, r2, comp, seg = 8, anel = 3) {
      const pf = [];
      for (let a = 0; a <= anel; a++) { const t = a / anel * Math.PI / 2; pf.push(new T.Vector2(Math.max(1e-4, r2 * Math.sin(t)), -comp - r2 * Math.cos(t))); }
      for (let a = 1; a <= anel; a++) { const t = Math.PI / 2 + a / anel * Math.PI / 2; pf.push(new T.Vector2(Math.max(1e-4, r1 * Math.sin(t)), -r1 * Math.cos(t))); }
      return new T.LatheGeometry(pf, seg);
    }
    // fita (tira de pano) ao longo de uma curva; a face olha para fora do eixo y (ou para normal(P, t))
    function fita(pts, larg, o = {}) {
      const curva = new T.CatmullRomCurve3(pts.map(vv), false, 'catmullrom', .5), n = o.seg || 24, pos = [], uv = [], idx = [];
      const P = V(), Tn = V(), N = V(), B = V();
      for (let i = 0; i <= n; i++) {
        const t = i / n; curva.getPointAt(t, P); curva.getTangentAt(t, Tn);
        if (o.normal) N.copy(o.normal(P, t)); else N.set(P.x, 0, P.z);
        if (N.lengthSq() < 1e-8) N.set(0, 0, 1); N.normalize();
        B.copy(Tn).cross(N).normalize(); const w = (typeof larg === 'number' ? larg : larg(t)) / 2;
        const tor = o.torcao ? o.torcao(t) : 0;
        for (const s of [-1, 1]) { const q = P.clone().addScaledVector(B, s * w).addScaledVector(N, tor * s * w); pos.push(q.x, q.y, q.z); uv.push(s < 0 ? 0 : 1, t * (o.rep || 1)); }
      }
      for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx); geo.computeVertexNormals(); return geo;
    }
    // junta várias malhas fixas num só desenho por material (menos chamadas de desenho)
    function assar(raiz) {
      if (!U || !U.mergeBufferGeometries) return raiz;
      raiz.updateMatrixWorld(true);
      const inv = raiz.matrixWorld.clone().invert(), grupos = new Map();
      raiz.traverse(o => {
        if (!o.isMesh || o.isInstancedMesh) return;
        let g = o.geometry.clone();
        if (!g.index) { const ix = []; for (let i = 0; i < g.attributes.position.count; i++) ix.push(i); g.setIndex(ix); }
        Object.keys(g.attributes).forEach(k => { if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); });
        if (!g.attributes.uv) g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        if (!g.attributes.normal) g.computeVertexNormals();
        g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, o.matrixWorld));
        if (!grupos.has(o.material)) grupos.set(o.material, []);
        grupos.get(o.material).push(g); o.geometry.dispose();
      });
      const out = new T.Group(); out.position.copy(raiz.position); out.quaternion.copy(raiz.quaternion); out.scale.copy(raiz.scale);
      grupos.forEach((lista, m) => { const geo = U.mergeBufferGeometries(lista); lista.forEach(g => g.dispose()); if (geo) malha(out, geo, m); });
      if (raiz.parent) { raiz.parent.add(out); raiz.parent.remove(raiz); }
      return out;
    }
    // gira obj para que o eixo +y local aponte para eixoY e o +z fique o mais perto possível de eixoZ
    function orientar(obj, eixoY, eixoZ) {
      const y = vv(eixoY).clone().normalize(), z = vv(eixoZ).clone(); z.sub(y.clone().multiplyScalar(z.dot(y))).normalize();
      const x = y.clone().cross(z); obj.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z));
    }
    // orienta obj com eixos dados no espaço de ref (ref pode ser o grupo do modelo)
    function alinharEm(obj, ref, eixoY, eixoZ) {
      const tmp = new T.Object3D(); orientar(tmp, eixoY, eixoZ);
      ref.updateWorldMatrix(true, true); const qr = ref.getWorldQuaternion(new T.Quaternion()), qp = obj.parent.getWorldQuaternion(new T.Quaternion());
      obj.quaternion.copy(qp.invert().multiply(qr).multiply(tmp.quaternion));
    }
    // posição de obj no espaço de ref
    const posEm = (obj, ref, out = V()) => { ref.updateWorldMatrix(true, false); obj.getWorldPosition(out); return ref.worldToLocal(out); };
    // membro de dois ossos (braço ou perna) pendurado em -y, com juntas animáveis
    function membro(pai, L1, L2, r0, r1, r2, m, o = {}) {
      const ombro = grupo(pai), braco = grupo(ombro), cot = grupo(braco, 0, -L1, 0), punho = grupo(cot, 0, -L2, 0);
      const g1 = capsula(r0, r1, L1, o.seg || 8, 3), g2 = capsula(r1 * .95, r2, L2, o.seg || 8, 3);
      if (o.ossudo) [g1, g2].forEach((g, k) => deform(g, (x, y, z) => { const t = Math.min(1, Math.max(0, -y / (k ? L2 : L1))); const b = 1 + o.ossudo * (Math.exp(-Math.pow((t - (k ? .02 : .97)) / .08, 2)) * 1.4 - .25 * Math.sin(t * Math.PI)) + fbm(x * 30, y * 30, z * 30, 2) * .08; return [x * b, y, z * b]; }));
      const m1 = malha(braco, g1, m), m2 = malha(cot, g2, m);
      return { ombro, braco, cot, punho, Lb: L1, La: L2, m1, m2 };
    }
    // IK de dois ossos: põe a mão em alvo, com o cotovelo apontando para polo (no espaço do pai do ombro)
    function ik(br, alvo, polo) {
      const P = br.ombro.position.clone(), Tg = vv(alvo).clone(), u = Tg.clone().sub(P); let d = u.length(); u.normalize();
      const L1 = br.Lb, L2 = br.La; d = Math.max(Math.abs(L1 - L2) + 1e-3, Math.min(d, (L1 + L2) * .999));
      const ang = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
      const pv = vv(polo).clone(); pv.sub(u.clone().multiplyScalar(pv.dot(u))).normalize();
      const d1 = u.clone().multiplyScalar(Math.cos(ang)).add(pv.multiplyScalar(Math.sin(ang))).normalize();
      const cot = P.clone().add(d1.clone().multiplyScalar(L1)), d2 = Tg.clone().sub(cot).normalize(), BX = V(0, -1, 0);
      br.ombro.rotation.set(0, 0, 0); br.braco.quaternion.setFromUnitVectors(BX, d1);
      br.cot.quaternion.setFromUnitVectors(BX, d2.applyQuaternion(br.braco.quaternion.clone().invert()));
    }
    /* mão: punho na origem, dedos para -y, palma para +z. lado = -1 mão direita (polegar em -x), +1 esquerda.
       o: { palma, larg, esp, dedo (fator), raio, garra (comprimento), matGarra, abrir } */
    function mao(pai, m, o = {}) {
      const g = grupo(pai), Lp = o.palma || .085, w = o.larg || .07, esp = o.esp || .024, df = o.dedo || 1, rd = o.raio || .0095, lado = o.lado || 1;
      const palma = malha(g, deform(new T.SphereGeometry(1, 10, 8), (x, y, z) => [x * w * .5 * (1 - .12 * y), y * Lp * .5 - Lp * .5, z * esp * .5 * (1 + .3 * y) - (z > 0 ? .002 : 0)]), m);
      const dedos = [], comp = [.92, 1.04, .98, .78], xs = [.36, .12, -.12, -.36], cache = new Map();
      const cap = (r1, r2, l) => { const k = [r1, r2, l].map(v => v.toFixed(4)).join(); if (!cache.has(k)) cache.set(k, capsula(r1, r2, l, 6, 2)); return cache.get(k).clone(); };
      const falange = (pai2, ls, rr, garra) => {
        const segs = []; let p = pai2;
        ls.forEach((l, i) => { const s = grupo(p, 0, i ? -ls[i - 1] : 0, 0); malha(s, cap(rr[i], rr[i + 1], l), m); segs.push(s); p = s; });
        if (garra) { const ponta = malha(p, tubo([[0, -ls[ls.length - 1] + .004, 0], [0, -ls[ls.length - 1] - garra * .55, garra * .12], [0, -ls[ls.length - 1] - garra, garra * .45]], t => rr[rr.length - 1] * 1.1 * (1 - t * .92), { seg: 6, rad: 5 }), o.matGarra || m); ponta.userData.garra = true; }
        return segs;
      };
      for (let f = 0; f < 4; f++) {
        const tot = .085 * df * comp[f], base = grupo(g, xs[f] * w * lado, -Lp * .92 + Math.abs(xs[f]) * Lp * .25, 0);
        base.rotation.z = -xs[f] * lado * (o.abrir ?? .15);
        dedos.push(falange(base, [tot * .43, tot * .32, tot * .25], [rd, rd * .92, rd * .82, rd * .66], o.garra));
      }
      const pol = grupo(g, lado * w * .4, -Lp * .28, esp * .3), dp = 1 + (df - 1) * .45; pol.rotation.set(-.55, -lado * .5, lado * .42);
      dedos.push(falange(pol, [.03 * dp, .026 * dp, .02 * dp], [rd * 1.2, rd * 1.08, rd * .95, rd * .75], o.garra ? o.garra * .7 : 0));
      cache.forEach(c => c.dispose());
      // dobra os dedos: k (0 a 1) por dedo ou um só número; tremor soma um pouco de vida
      const curvar = (k, tremor = 0, t = 0) => dedos.forEach((d, i) => {
        const kk = (Array.isArray(k) ? k[i] : k) + (tremor ? tremor * Math.sin(t * (7 + i * 1.7) + i * 2.1) : 0);
        d.forEach((s, j) => { s.rotation.x = -kk * (i === 4 ? [.25, .5, .4][j] : [.75, 1.05, .8][j]); });
      });
      return { g, dedos, curvar, palma };
    }
    // brilho em volta (sprite somado à luz)
    let texBrilho = null;
    function halo(pai, cor, tam, x = 0, y = 0, z = 0) {
      if (!texBrilho) { const [c, x2] = tela(128); const gr = x2.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x2.fillStyle = gr; x2.fillRect(0, 0, 128, 128); texBrilho = tex(c); }
      const sm2 = F.guardar(new T.SpriteMaterial({ map: texBrilho, color: new T.Color(cor), transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      const sp = new T.Sprite(sm2); sp.scale.set(tam, tam, 1); sp.position.set(x, y, z); pai.add(sp); return sp;
    }
    /* núcleo roxo: esfera brilhante numa moldura escura de espinhos, como patas de aranha (olha para +z) */
    function nucleo(pai, r = .06, o = {}) {
      const g = grupo(pai), luzM = mat({ color: '#2a0640', emissive: '#6a1eff', emissiveIntensity: 1.6, roughness: .15, metalness: .1 });
      const miolo = mat({ color: '#000000', emissive: '#d2b0ff', emissiveIntensity: 1.3 });
      const esf = malha(g, new T.SphereGeometry(r, 20, 14), luzM); esf.scale.z = .8;
      malha(g, new T.SphereGeometry(r * .3, 10, 8), miolo).position.z = r * .66;
      const escuro = mat({ color: '#140c12', roughness: .35, metalness: .55 });
      const mold = grupo(g);
      malha(mold, new T.TorusGeometry(r * 1.12, r * .2, 6, 24), escuro);
      const n = o.pernas || 8;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + .2, c = Math.cos(a), s = Math.sin(a), k = 1 + (i % 2) * .35;
        malha(mold, tubo([[c * r * 1.1, s * r * 1.1, r * .1], [c * r * 1.9 * k, s * r * 1.9 * k, r * .55], [c * r * 2.7 * k, s * r * 2.7 * k, r * .2], [c * r * 3.3 * k, s * r * 3.3 * k - r * .3, -r * .35]], t => r * .16 * (1 - t * .85), { seg: 10, rad: 5 }), escuro);
        const b = .5 + a; malha(mold, new T.ConeGeometry(r * .12, r * .9, 5), escuro).position.set(Math.cos(b) * r * 1.35, Math.sin(b) * r * 1.35, r * .1);
        mold.children[mold.children.length - 1].rotation.z = b - Math.PI / 2;
      }
      const moldA = assar(mold);
      const h = halo(g, o.cor || '#6a22d8', r * (o.halo || 9), 0, 0, r * .9);
      const pulso = t => {
        const ph = (t * .72) % 1, k = Math.exp(-Math.pow((ph - .1) / .05, 2)) + .6 * Math.exp(-Math.pow((ph - .3) / .06, 2));
        luzM.emissiveIntensity = 1.1 + k * 1.5 + Math.sin(t * .5) * .2; h.material.opacity = .35 + k * .4; esf.scale.set(1 + k * .07, 1 + k * .07, .8 + k * .06);
      };
      return { g, pulso, moldura: moldA };
    }
    // utilidades de pintura
    const pinta = {
      grao(x, w, h, n, a, tam = 2, cores) { for (let i = 0; i < n; i++) { x.fillStyle = cores ? cores[(Math.random() * cores.length) | 0] : `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},${a * Math.random()})`; x.globalAlpha = cores ? a * Math.random() : 1; x.fillRect(Math.random() * w, Math.random() * h, tam, tam); } x.globalAlpha = 1; },
      mancha(x, cx, cy, r, cor, a = 1, pontas = 9) { x.save(); x.globalAlpha = a; x.fillStyle = cor; x.beginPath(); for (let i = 0; i <= pontas * 2; i++) { const an = i / (pontas * 2) * Math.PI * 2, rr = r * (.55 + Math.random() * .6); x.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); } x.fill(); x.restore(); },
      escorrido(x, cx, cy, comp, larg, cor, a = 1) { x.save(); x.globalAlpha = a; x.strokeStyle = cor; x.lineCap = 'round'; let px = cx, py = cy; x.lineWidth = larg; x.beginPath(); x.moveTo(px, py); const n = 12; for (let i = 0; i < n; i++) { px += (Math.random() - .5) * larg * .8; py += comp / n; x.lineWidth = larg * (1 - i / n * .6); x.lineTo(px, py); } x.stroke(); x.beginPath(); x.fillStyle = cor; x.arc(px, py, larg * .7, 0, 7); x.fill(); x.restore(); },
      veia(x, x0, y0, ang, comp, larg, cor, a = .5, ramos = 2) { x.save(); x.strokeStyle = cor; x.globalAlpha = a; x.lineCap = 'round'; const rec = (px, py, an, c, l, d) => { x.lineWidth = l; x.beginPath(); x.moveTo(px, py); let qx = px, qy = py; const n = 8; for (let i = 0; i < n; i++) { an += (Math.random() - .5) * .5; qx += Math.cos(an) * c / n; qy += Math.sin(an) * c / n; x.lineTo(qx, qy); if (d > 0 && Math.random() < .18) rec(qx, qy, an + (Math.random() < .5 ? -.7 : .7), c * .5, l * .6, d - 1); } x.stroke(); }; rec(x0, y0, ang, comp, larg, ramos); x.restore(); },
    };
    return { T, V, vv, mat, tela, tex, malha, grupo, fbm, vn, deform, casca, tubo, capsula, fita, assar, orientar, alinharEm, posEm, membro, ik, mao, halo, nucleo, pinta };
  }
  (NS.formasFilho = NS.formasFilho || {}).muitos_bracos = {
    nome: 'Muitos braços (mulher abraçada)',
    criar: (F, s) => {
      const K = kit(F), { T, V, mat, tela, tex, malha, grupo, fbm, deform, casca, tubo, fita, assar, orientar, membro, ik, mao, nucleo, pinta, alinharEm, posEm } = K;
      const R = NS.rng(505), g = grupo(null), corpo = grupo(g), PI = Math.PI;

      /* ---------- silhueta [y, largura, profundidade, deslocZ] ---------- */
      const PB = [[0, .52, .47, -.02], [.05, .4, .36, -.01], [.2, .31, .28, 0], [.5, .255, .225, 0], [.9, .235, .195, 0], [1.15, .225, .175, 0], [1.35, .185, .145, 0], [1.55, .2, .155, .015], [1.68, .21, .135, .01], [1.76, .2, .12, 0], [1.82, .165, .1, .005], [1.86, .1, .075, .012], [1.89, .065, .06, .018], [1.96, .052, .052, .025]];
      const interp = (P, y) => { if (y <= P[0][0]) return P[0].slice(1); for (let i = 1; i < P.length; i++) if (y <= P[i][0]) { const a = P[i - 1], b = P[i], k = (y - a[0]) / (b[0] - a[0]); return [1, 2, 3].map(j => a[j] + (b[j] - a[j]) * k); } return P[P.length - 1].slice(1); };
      // ponto e normal na superfície do corpo (ang = 0 na frente, cresce para +x)
      const sup = (y, ang, folga = 0) => { const [w, d, dz] = interp(PB, y); return V(Math.sin(ang) * (w + folga), y, Math.cos(ang) * (d + folga) + dz); };
      const nrm = (y, ang) => { const [w, d] = interp(PB, y); return V(Math.sin(ang) / w, 0, Math.cos(ang) / d).normalize(); };

      /* ---------- texturas ---------- */
      // vinha bordada em dourado (caule, folhas e botões)
      const vinha = (x, x0, y0, x1, y1, esc = 1, cor = '#d6a845') => {
        x.save(); x.strokeStyle = cor; x.fillStyle = cor; x.lineWidth = 2.2 * esc; x.lineCap = 'round';
        const n = 22, pts = [];
        for (let i = 0; i <= n; i++) { const t = i / n, px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t, dx = y1 - y0, dy = -(x1 - x0), l = Math.hypot(dx, dy) || 1; const o = Math.sin(t * PI * 4) * 9 * esc; pts.push([px + dx / l * o, py + dy / l * o]); }
        x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke();
        pts.forEach((p, i) => { if (i % 2 || i === 0) return; const a = Math.atan2(y1 - y0, x1 - x0) + (i % 4 ? 1 : -1) * 1.1; x.save(); x.translate(p[0], p[1]); x.rotate(a); x.beginPath(); x.ellipse(7 * esc, 0, 7 * esc, 2.6 * esc, 0, 0, 7); x.fill(); x.restore(); if (i % 6 === 0) { x.beginPath(); x.arc(p[0], p[1], 2.4 * esc, 0, 7); x.fill(); } });
        x.restore();
      };
      const panos = ['#6e1416', '#86262a', '#a2524e', '#5a0e12', '#94383a', '#b88072'];
      // pano do corpo: faixas diagonais de tecidos enrolados, bordados, encardidos; barra recortada
      const [cc, xc] = tela(512, 1024);
      xc.fillStyle = '#5e1214'; xc.fillRect(0, 0, 512, 1024);
      for (let k = -14; k < 24; k++) {
        const y0 = k * 62 + R() * 20, inc = (R() < .5 ? -1 : 1) * (60 + R() * 70), h = 40 + R() * 46, cor = panos[(R() * panos.length) | 0];
        xc.fillStyle = cor; xc.beginPath(); xc.moveTo(-10, y0); xc.lineTo(522, y0 + inc); xc.lineTo(522, y0 + inc + h); xc.lineTo(-10, y0 + h); xc.fill();
        xc.strokeStyle = 'rgba(40,6,8,.55)'; xc.lineWidth = 2; xc.beginPath(); xc.moveTo(-10, y0 + h); xc.lineTo(522, y0 + inc + h); xc.stroke();
        if (R() < .7) vinha(xc, -10, y0 + h / 2, 522, y0 + inc + h / 2, .8 + R() * .4, R() < .8 ? '#d6a845' : '#e8c878');
      }
      for (let i = 0; i < 70; i++) pinta.mancha(xc, R() * 512, R() * 1024, 8 + R() * 36, R() < .5 ? '#3a1210' : '#5a3020', .12 + R() * .18);
      for (let i = 0; i < 160; i++) { const x0 = R() * 512; xc.strokeStyle = `rgba(20,4,4,${.05 + R() * .12})`; xc.lineWidth = 1 + R() * 4; xc.beginPath(); xc.moveTo(x0, R() * 1024); xc.lineTo(x0 + (R() - .5) * 30, R() * 1024); xc.stroke(); }
      pinta.grao(xc, 512, 1024, 9000, .08, 2);
      xc.globalCompositeOperation = 'destination-out';
      for (let x0 = -10; x0 < 520;) { const w = 8 + R() * 24, l = 20 + R() * 120; xc.beginPath(); xc.moveTo(x0, 1025); xc.lineTo(x0 + w * (.3 + R() * .4), 1024 - l); xc.lineTo(x0 + w, 1025); xc.fill(); x0 += w + R() * 10; }
      xc.globalCompositeOperation = 'source-over';
      const texC = tex(cc);
      const matCorpo = mat({ map: texC, bumpMap: texC, bumpScale: .006, roughness: .78, alphaTest: .5, duplo: true });
      // tira bordada (u atravessa a tira, v corre ao longo; a ponta solta fica no topo da tela, recortada)
      const tiraTex = (base, cor2) => {
        const [c, x] = tela(128, 512); x.fillStyle = base; x.fillRect(0, 0, 128, 512);
        x.fillStyle = cor2; x.fillRect(0, 0, 10, 512); x.fillRect(118, 0, 10, 512);
        vinha(x, 64, 520, 64, -10, 1.1); for (let i = 0; i < 30; i++) pinta.mancha(x, R() * 128, R() * 512, 5 + R() * 18, '#2a0808', .15);
        pinta.grao(x, 128, 512, 2500, .1, 2);
        x.globalCompositeOperation = 'destination-out';
        for (let x0 = -4; x0 < 132;) { const w = 6 + R() * 14, l = 20 + R() * 90; x.beginPath(); x.moveTo(x0, -1); x.lineTo(x0 + w * .5, l); x.lineTo(x0 + w, -1); x.fill(); x0 += w + R() * 6; }
        x.globalCompositeOperation = 'source-over'; return tex(c);
      };
      const matTiras = [tiraTex('#7e181c', '#4a0a0c'), tiraTex('#a2524e', '#6e2a2c'), tiraTex('#c49a8a', '#8a4c46'), tiraTex('#5e1014', '#c69a3e')].map(t => mat({ map: t, roughness: .75, alphaTest: .5, duplo: true }));
      // pele dos braços: pálida, rosada e acinzentada, com veias finas e dobras de nó dos dedos
      const [cp, xp] = tela(256, 256); xp.fillStyle = '#b39184'; xp.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 50; i++) pinta.mancha(xp, R() * 256, R() * 256, 6 + R() * 22, R() < .5 ? '#a88a7e' : '#d4bcae', .35);
      for (let i = 0; i < 18; i++) pinta.veia(xp, R() * 256, R() * 256, R() * 6.3, 30 + R() * 60, 1, '#8a8aa8', .3, 1);
      for (let i = 0; i < 60; i++) { const y0 = R() * 256; xp.strokeStyle = `rgba(70,40,34,${.08 + R() * .15})`; xp.lineWidth = .8 + R(); xp.beginPath(); xp.moveTo(R() * 256, y0); xp.lineTo(R() * 256, y0 + (R() - .5) * 10); xp.stroke(); }
      pinta.grao(xp, 256, 256, 3000, .06, 1);
      const texP = tex(cp, [2, 1]);
      const matPele = mat({ map: texP, bumpMap: texP, bumpScale: .006, roughness: .66 });
      // cada braço com um tom de pele um pouco diferente (são de pessoas diferentes)
      const pelesB = [matPele, mat({ map: texP, bumpMap: texP, bumpScale: .006, roughness: .7, color: '#cfc2c8' }), mat({ map: texP, bumpMap: texP, bumpScale: .006, roughness: .64, color: '#e0c8b0' }), mat({ map: texP, bumpMap: texP, bumpScale: .006, roughness: .72, color: '#b8aaa0' })];

      /* ---------- corpo enrolado em pano ---------- */
      const NV = 40, perfil = [];
      for (let j = 0; j < NV; j++) { const y = j / (NV - 1) * 1.885, q = interp(PB, y); perfil.push([y, q[0], q[1], q[2]]); }
      const tronco = grupo(corpo);
      malha(tronco, casca(perfil, { seg: 40, quadrado: .9, deform: (x, y, z, j, u, ang) => { const b = Math.max(0, .35 - y) / .35; const f = 1 + .05 * fbm(x * 6, y * 5, z * 6) + b * (.12 * Math.sin(ang * 6 + fbm(x * 2, 0, z * 2) * 4)) + .025 * Math.sin(y * 34 + ang * 2); return [x * f, y, z * f]; } }), matCorpo);
      // faixas enroladas em espiral por cima
      for (let i = 0; i < 6; i++) {
        const a0 = R() * PI * 2, voltas = (R() < .5 ? -1 : 1) * (.7 + R() * .5), y0 = .35 + i * .26 + R() * .1, queda = .25 + R() * .25, pts = [];
        for (let k = 0; k <= 16; k++) { const s2 = k / 16, y = y0 + queda * (s2 - .5); pts.push(sup(y, a0 + voltas * s2 * PI * 2, .012 + Math.sin(s2 * 9) * .004)); }
        malha(tronco, fita(pts, .085 + R() * .04, { seg: 60, rep: 2.5 }), matTiras[i % 4]);
      }
      // tiras soltas pendendo dos ombros e da cintura
      const soltas = grupo(corpo);
      [[1.78, .95], [1.78, -1.0], [1.7, 1.35], [1.72, -1.4], [1.3, 1.6], [1.25, -1.55], [1.45, 2.3], [1.5, -2.4]].forEach(([y, a], i) => {
        const p0 = sup(y, a, .02), n = nrm(y, a), comp = .45 + R() * .4, pts = [], f0 = R() * 6, lat = V(n.z, 0, -n.x);
        for (let k = 0; k <= 6; k++) { const s2 = k / 6; pts.push(p0.clone().addScaledVector(n, .03 + s2 * .06 + Math.sin(s2 * 7 + f0) * .012).addScaledVector(lat, Math.sin(s2 * 5 + f0) * .025 * s2).add(V(0, -comp * s2, 0))); }
        malha(soltas, fita(pts, t => .07 - t * .03, { seg: 14, normal: () => n, torcao: t => Math.sin(t * 4 + f0) * .5 * t }), matTiras[i % 4]);
      });

      /* ---------- núcleo no peito ---------- */
      const nuc = nucleo(tronco, .04, { halo: 9 }); const pN = sup(1.63, 0, -.004); nuc.g.position.copy(pN); nuc.g.rotation.x = -.2;

      /* ---------- cabeça: sorriso triste, lágrimas, cabelo ondulado castanho avermelhado ---------- */
      const HC = V(-.03, 2.04, .035);
      const pesc = grupo(corpo, 0, 1.84, .02); malha(pesc, tubo([[0, -.02, 0], [-.01, .08, .008], [-.025, .17, .012]], t => .052 - t * .01, { seg: 6, rad: 12 }), matPele);
      const cab = grupo(corpo, HC.x, HC.y, HC.z);
      // rosto pintado (frente em u = 0,25): sombras de choro, olhos meio fechados, sorriso triste
      const [cf, xf] = tela(512, 256);
      const cx = 128, ey = 120;
      xf.fillStyle = '#c7a494'; xf.fillRect(0, 0, 512, 256);
      let gq = xf.createRadialGradient(cx, ey + 6, 8, cx, ey + 10, 92); gq.addColorStop(0, '#dcbcab'); gq.addColorStop(.55, '#c8a292'); gq.addColorStop(1, '#8e685c'); xf.fillStyle = gq; xf.fillRect(cx - 100, 0, 200, 256);
      for (let i = 0; i < 40; i++) pinta.mancha(xf, R() * 512, R() * 256, 4 + R() * 14, R() < .5 ? '#ad8678' : '#dcc0b2', .2);
      const sombraE = (x0, y0, rx, ry, cor, a) => { const gg = xf.createRadialGradient(x0, y0, 1, x0, y0, Math.max(rx, ry)); gg.addColorStop(0, cor); gg.addColorStop(1, 'rgba(0,0,0,0)'); xf.save(); xf.globalAlpha = a; xf.translate(x0, y0); xf.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry)); xf.translate(-x0, -y0); xf.fillStyle = gg; xf.beginPath(); xf.arc(x0, y0, Math.max(rx, ry), 0, 7); xf.fill(); xf.restore(); };
      [-1, 1].forEach(s2 => { sombraE(cx + s2 * 40, ey + 26, 12, 26, '#6e4438', .5); sombraE(cx + s2 * 27, ey + 2, 19, 15, '#5a2e2e', .75); sombraE(cx + s2 * 24, ey + 30, 14, 8, '#c86a62', .35); });
      sombraE(cx, ey + 26, 7, 6, '#c06660', .4); sombraE(cx, ey + 64, 22, 10, '#7a5246', .35);
      [-1, 1].forEach(s2 => {
        const ex = cx + s2 * 27;
        // olho amendoado meio fechado, o canto de fora caído, a pálpebra de baixo vermelha
        xf.fillStyle = '#e6d6c8'; xf.beginPath(); xf.moveTo(ex - 13 * s2, ey - 2); xf.quadraticCurveTo(ex, ey - 6, ex + 13 * s2, ey + 4); xf.quadraticCurveTo(ex, ey + 6, ex - 13 * s2, ey - 2); xf.fill();
        xf.fillStyle = '#4a2a1a'; xf.beginPath(); xf.arc(ex - s2 * 2, ey + 1, 4.4, 0, 7); xf.fill(); xf.fillStyle = '#120806'; xf.beginPath(); xf.arc(ex - s2 * 2, ey + 1, 2, 0, 7); xf.fill();
        xf.fillStyle = 'rgba(255,255,255,.95)'; xf.beginPath(); xf.arc(ex - s2 * 3.4, ey - .4, 1.1, 0, 7); xf.fill();
        xf.fillStyle = '#a07264'; xf.beginPath(); xf.moveTo(ex - 15 * s2, ey - 3); xf.quadraticCurveTo(ex, ey - 12, ex + 15 * s2, ey + 3); xf.quadraticCurveTo(ex, ey - 1.5, ex - 15 * s2, ey - 3); xf.fill();
        xf.strokeStyle = '#2e140e'; xf.lineWidth = 1.6; xf.beginPath(); xf.moveTo(ex - 14 * s2, ey - 2); xf.quadraticCurveTo(ex, ey - 3.5, ex + 14 * s2, ey + 3.5); xf.stroke();
        xf.strokeStyle = '#b4504c'; xf.lineWidth = 1.4; xf.beginPath(); xf.moveTo(ex - 12 * s2, ey + 1); xf.quadraticCurveTo(ex, ey + 7.5, ex + 13 * s2, ey + 4.5); xf.stroke();
        xf.strokeStyle = 'rgba(90,40,30,.5)'; xf.lineWidth = 1; xf.beginPath(); xf.moveTo(ex - 11 * s2, ey + 10); xf.quadraticCurveTo(ex, ey + 14, ex + 11 * s2, ey + 9); xf.stroke();
        // sobrancelha erguida no meio
        xf.strokeStyle = '#3a1c12'; xf.lineWidth = 3; xf.lineCap = 'round'; xf.beginPath(); xf.moveTo(ex - 18 * s2, ey - 14); xf.quadraticCurveTo(ex - 10 * s2, ey - 22, ex + 2 * s2, ey - 19); xf.quadraticCurveTo(ex + 10 * s2, ey - 16, ex + 16 * s2, ey - 9); xf.stroke();
        // nariz e sulcos até a boca
        xf.strokeStyle = 'rgba(100,52,42,.55)'; xf.lineWidth = 1.4; xf.beginPath(); xf.moveTo(cx + s2 * 6, ey - 6); xf.quadraticCurveTo(cx + s2 * 8, ey + 14, cx + s2 * 9, ey + 26); xf.stroke();
        xf.beginPath(); xf.moveTo(cx + s2 * 13, ey + 30); xf.quadraticCurveTo(cx + s2 * 22, ey + 38, cx + s2 * 22, ey + 48); xf.stroke();
        // lágrima: rastro brilhante descendo
        const gl = xf.createLinearGradient(0, ey + 6, 0, ey + 80); gl.addColorStop(0, 'rgba(255,245,240,.85)'); gl.addColorStop(1, 'rgba(255,245,240,0)'); xf.strokeStyle = gl; xf.lineWidth = 2.6;
        xf.beginPath(); xf.moveTo(ex + s2 * 5, ey + 6); xf.bezierCurveTo(ex + s2 * 9, ey + 30, ex + s2 * 4, ey + 50, ex + s2 * 7, ey + 78); xf.stroke();
      });
      xf.strokeStyle = 'rgba(90,40,32,.45)'; xf.lineWidth = 1.1; for (let i = 0; i < 3; i++) { xf.beginPath(); xf.moveTo(cx - 9, ey - 26 - i * 5); xf.quadraticCurveTo(cx, ey - 30 - i * 5, cx + 9, ey - 26 - i * 5); xf.stroke(); }
      xf.fillStyle = 'rgba(70,28,22,.7)'; xf.beginPath(); xf.ellipse(cx - 5.5, ey + 28, 3.2, 1.8, .3, 0, 7); xf.ellipse(cx + 5.5, ey + 28, 3.2, 1.8, -.3, 0, 7); xf.fill();
      // boca fechada num sorriso triste: cantos um pouco para cima, lábios finos e secos
      xf.fillStyle = '#8c4c46'; xf.beginPath(); xf.moveTo(cx - 20, ey + 43); xf.quadraticCurveTo(cx - 8, ey + 39, cx, ey + 41); xf.quadraticCurveTo(cx + 8, ey + 39, cx + 20, ey + 42); xf.quadraticCurveTo(cx, ey + 46, cx - 20, ey + 43); xf.fill();
      xf.fillStyle = '#a0605a'; xf.beginPath(); xf.moveTo(cx - 18, ey + 44); xf.quadraticCurveTo(cx, ey + 46.5, cx + 18, ey + 43); xf.quadraticCurveTo(cx, ey + 53, cx - 18, ey + 44); xf.fill();
      xf.strokeStyle = '#2e100c'; xf.lineWidth = 1.7; xf.beginPath(); xf.moveTo(cx - 21, ey + 42); xf.quadraticCurveTo(cx, ey + 47, cx + 21, ey + 41); xf.stroke();
      pinta.grao(xf, 512, 256, 4000, .05, 1);
      const texF = tex(cf);
      const matRosto = mat({ map: texF, roughness: .52, bumpMap: texF, bumpScale: .0015 });
      // crânio com nariz, maçãs, órbitas e queixo esculpidos na esfera (o queixo afina em V)
      const geoCab = deform(new T.SphereGeometry(.1, 36, 28), (x, y, z) => {
        let dz = 0; const nx = x / .1, ny = y / .1;
        if (z > 0) {
          dz += .024 * Math.exp(-(nx * nx) / .01 - Math.pow(ny + .08, 2) / .045) * (ny < .14 ? 1 : 0);
          dz -= .014 * Math.exp(-Math.pow(Math.abs(nx) - .27, 2) / .012 - Math.pow(ny - .05, 2) / .012);
          dz += .008 * Math.exp(-Math.pow(Math.abs(nx) - .42, 2) / .02 - Math.pow(ny + .12, 2) / .02);
          dz += .004 * Math.exp(-(nx * nx) / .02 - Math.pow(ny + .42, 2) / .006);
        }
        const q = ny < -.1 ? 1 - Math.min(.32, (-.1 - ny) * .42) : 1;
        return [x * .82 * q, y * 1.2, z * .96 * (ny < -.3 ? .94 : 1) + dz];
      });
      malha(cab, geoCab, matRosto);
      // lágrimas: gotas brilhantes descendo pelas bochechas
      const matLag = mat({ color: '#e8eef4', roughness: .02, metalness: .2, transparent: true, opacity: .55 }, false);
      const lagrimas = [-1, 1].map((s2, i) => { const l = malha(cab, new T.SphereGeometry(.0035, 8, 6), matLag); l.scale.set(.8, 1.5, .7); return { l, s2, f: i * .5 }; });
      // cabelo: cartões ondulados e algumas mechas soltas
      const [ch, xh] = tela(256, 512); xh.clearRect(0, 0, 256, 512);
      const gh = xh.createLinearGradient(0, 512, 0, 0); gh.addColorStop(0, 'rgba(44,16,10,1)'); gh.addColorStop(.5, 'rgba(44,16,10,1)'); gh.addColorStop(.75, 'rgba(44,16,10,0)'); xh.fillStyle = gh; xh.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 380; i++) {
        const x0 = R() * 256, len = 512 * (.5 + R() * .5), w = 1 + R() * 2.6, amp = 8 + R() * 10, fase = R() * 6;
        xh.strokeStyle = ['#4e1e14', '#6a2c1c', '#381410', '#83402c', '#200c08'][(R() * 5) | 0]; xh.lineWidth = w; xh.lineCap = 'round';
        xh.beginPath(); for (let k = 0; k <= 24; k++) { const yy = 512 - len * k / 24, xx = x0 + Math.sin(k / 24 * 9 + fase) * amp * (k / 24); k ? xh.lineTo(xx, yy) : xh.moveTo(xx, yy); } xh.stroke();
      }
      const matCabelo = mat({ map: tex(ch), alphaTest: .45, duplo: true, roughness: .6, metalness: 0 });
      const matCabeloS = mat({ color: '#3a160e', roughness: .55 });
      malha(cab, new T.SphereGeometry(.104, 22, 12, 0, PI * 2, 0, 1.55), matCabeloS).rotation.x = -.55;
      const cards = [], fios = [];
      const ondula = (p, k, f) => [p[0] + Math.sin(k * 7 + f) * .018 * k, p[1], p[2] + Math.cos(k * 6 + f) * .012 * k];
      for (let i = 0; i < 16; i++) {
        const a = (i / 15 - .5) * 4.4 + PI, sx = Math.sin(a), sz = Math.cos(a), frente = Math.abs(a - PI) > 1.6, comp = frente ? .5 + R() * .2 : .65 + R() * .25, f = R() * 6, pts = [];
        for (let k = 0; k <= 6; k++) {
          const s2 = k / 6, r = .1 + s2 * .07, y = .09 - s2 * comp;
          let p = [sx * r * (1 + s2 * .3), y, sz * r - (frente ? 0 : s2 * .08) + (frente ? s2 * .05 : 0)];
          if (k === 0) p = [sx * .06, .095, sz * .06];
          p = ondula(p, s2, f);
          const w = afastaCorpo(V(p[0] + HC.x, p[1] + HC.y, p[2] + HC.z)); pts.push([w.x - HC.x, w.y - HC.y, w.z - HC.z]);
        }
        cards.push(fita(pts, t => .085 * (1 - t * .3), { seg: 16 }));
        if (i % 2 === 0) fios.push(tubo(pts.map((p, k) => [p[0] * 1.03, p[1], p[2] * 1.03]), t => .006 * (1 - t * .7), { seg: 14, rad: 4 }));
      }
      function afastaCorpo(p) { if (p.y > 1.95) return p; const [w, d, dz] = interp(PB, p.y), ex = p.x / (w + .03), ez = (p.z - dz) / (d + .03), r = Math.hypot(ex, ez); if (r < 1 && r > 1e-4) { p.x /= r; p.z = dz + (p.z - dz) / r; } return p; }
      const U2 = T.BufferGeometryUtils, junta = (l, m) => { const gg = U2 && U2.mergeBufferGeometries(l); if (gg) { l.forEach(q => q.dispose()); malha(cab, gg, m); } else l.forEach(q => malha(cab, q, m)); };
      junta(cards, matCabelo); junta(fios, matCabeloS);

      /* ---------- muitos braços abraçando o corpo ---------- */
      const abraco = grupo(corpo), bracos = [];
      let nB = 0;
      const fazBraco = (pts, raio, maoOp, palma, dedosDir) => {
        const tmp = grupo(null), mp = pelesB[nB++ % pelesB.length];
        malha(tmp, tubo(pts, raio, { seg: 22, rad: 8 }), mp);
        const fim = K.vv(pts[pts.length - 1]), ant = K.vv(pts[pts.length - 2]), dir = dedosDir ? K.vv(dedosDir).normalize() : fim.clone().sub(ant).normalize();
        const pn = K.vv(palma).clone().normalize(), lado = Math.sign(dir.clone().negate().cross(pn).y) || 1;
        const m = mao(tmp, mp, { palma: .08, larg: .066, esp: .022, dedo: 1.05, raio: .0092, abrir: .18, lado, ...maoOp });
        m.g.position.copy(fim); orientar(m.g, dir.clone().negate(), pn); m.curvar(maoOp.curva ?? .5, .12, R() * 9);
        return assar(tmp);
      };
      const ABR = [[1.72, .85, .25, -.14], [1.56, -.8, -.42, .1], [1.44, .95, -.12, -.2], [1.3, -.9, .55, .15], [1.18, .72, .15, -.22], [1.03, -.7, -.3, .17], [.9, .9, -.55, -.13], [.76, -.85, .25, .2], [.62, .8, .05, -.16], [.5, -.75, .45, .12], [1.5, -.15, .75, -.06], [.98, .2, -.8, .08]];
      const raioBraco = t => { let r = .031 - t * .008; r += .005 * Math.exp(-Math.pow((t - .47) / .05, 2)); r -= .004 * Math.exp(-Math.pow((t - .52) / .08, 2)); if (t > .9) r *= 1 - (t - .9) * 2.2; return r; };
      ABR.forEach(([y0, a0f, a1, sub], i) => {
        const a0 = a0f * PI, pts = [];
        for (let k = 0; k <= 8; k++) {
          const s2 = k / 8, a = a0 + (a1 - a0) * s2, y = y0 + sub * s2, cot = Math.exp(-Math.pow((s2 - .47) / .1, 2)) * .022;
          pts.push(sup(y, a, (k === 0 ? -.04 : .018) + cot));
        }
        const fim = pts[8], antes = pts[7], dir = fim.clone().sub(antes).normalize(), n = nrm(fim.y, a1);
        const b = fazBraco(pts, raioBraco, { curva: .55 + R() * .25 }, n.clone().negate(), dir);
        abraco.add(b); bracos.push({ g: b, fase: i * .7, giro: (a1 > a0 ? 1 : -1) });
      });
      // mãos que vêm de trás: duas nos ombros, uma no alto da cabeça
      [-1, 1].forEach((sx, i) => {
        const pts = [[sx * .1, 1.42, -.16], [sx * .15, 1.66, -.15], [sx * .17, 1.83, -.08], [sx * .16, 1.86, .02], [sx * .13, 1.8, .08]];
        const b = fazBraco(pts, t => .033 - t * .008, { curva: .4 }, V(-sx * .2, -.4, -1), V(sx * -.15, -1, .25));
        abraco.add(b); bracos.push({ g: b, fase: 2 + i, giro: 0 });
      });
      const bCab = fazBraco([[.04, -.3, -.13], [.03, -.06, -.17], [.02, .11, -.13], [0, .16, -.05], [-.005, .145, .025]], t => .032 - t * .008, { curva: .62 }, V(0, -1, .35), V(0, -.75, 1));
      cab.add(bCab);

      /* ---------- os dois braços que se estendem para a frente ---------- */
      const alcance = [-1, 1].map(sx => {
        const br = membro(corpo, .42, .4, .046, .036, .03, matPele, { seg: 12, ossudo: .35 });
        br.ombro.position.set(sx * .19, 1.5, .03);
        const alvo = V(sx * .55, 1.38, .66), polo = V(sx * .6, -1, -.3);
        ik(br, alvo, polo);
        const m = mao(br.punho, matPele, { palma: .12, larg: .1, esp: .03, dedo: 1.35, raio: .0125, abrir: .34, lado: sx < 0 ? 1 : -1 });
        const dA = posEm(br.punho, g).sub(posEm(br.cot, g)).normalize();
        alinharEm(m.g, g, dA.clone().negate(), V(0, 1, .2));
        { const pts = []; for (let k = 0; k <= 30; k++) { const s2 = k / 30, a = s2 * PI * 2 * 3.2; pts.push(V(Math.cos(a) * (.05 - s2 * .006), -.04 - s2 * .3, Math.sin(a) * (.05 - s2 * .006))); } malha(br.braco, fita(pts, .11, { seg: 90, normal: (P) => V(P.x, 0, P.z), rep: 3, torcao: () => .18 }), matTiras[sx > 0 ? 0 : 3]); }
        // tiras de pano penduradas do antebraço
        br.cot.updateWorldMatrix(true, false); const qInv = br.cot.getWorldQuaternion(new T.Quaternion()).invert(), baixo = V(0, -1, 0).applyQuaternion(qInv);
        for (let k = 0; k < 3; k++) {
          const y0 = -.06 - k * .11, comp = .2 + R() * .22, o = V(0, y0, 0), pts = [], f0 = R() * 6;
          for (let j = 0; j <= 6; j++) pts.push(o.clone().addScaledVector(baixo, .03 + comp * j / 6).add(V(Math.sin(j * 1.2 + f0) * .022 * j / 6, 0, Math.cos(j * .9 + f0) * .015 * j / 6)));
          malha(br.cot, fita(pts, t => .055 - t * .025, { seg: 12, normal: () => V(0, 0, 1), torcao: t => Math.sin(t * 5 + f0) * .7 }), matTiras[(k + (sx > 0 ? 1 : 0)) % 4]);
        }
        m.curvar(.15);
        return { sx, br, m, alvo, polo };
      });

      /* ---------- fotografias antigas presas ao pano ---------- */
      const fotoTex = k => {
        const [c, x] = tela(128, 160);
        x.fillStyle = '#e4d6b8'; x.fillRect(0, 0, 128, 160);
        const gi = x.createRadialGradient(64, 70, 10, 64, 70, 80); gi.addColorStop(0, '#c2a67c'); gi.addColorStop(1, '#6e5436'); x.fillStyle = gi; x.fillRect(9, 9, 110, 124);
        const pessoa = (px, py, h, escuro, saia) => {
          x.fillStyle = escuro ? '#2e2216' : '#8a6e4c';
          x.beginPath(); if (saia) { x.moveTo(px - h * .12, py - h * .62); x.lineTo(px + h * .12, py - h * .62); x.lineTo(px + h * .2, py); x.lineTo(px - h * .2, py); } else { x.moveTo(px - h * .13, py - h * .64); x.lineTo(px + h * .13, py - h * .64); x.lineTo(px + h * .1, py); x.lineTo(px - h * .1, py); } x.fill();
          x.fillStyle = '#d2b892'; x.beginPath(); x.ellipse(px, py - h * .76, h * .085, h * .11, 0, 0, 7); x.fill();
          x.fillStyle = '#2a1c12'; x.beginPath(); x.ellipse(px, py - h * .83, h * .09, h * .06, 0, PI, 0); x.fill();
          x.fillStyle = '#120c08'; x.fillRect(px - h * .045, py - h * .78, h * .025, h * .02); x.fillRect(px + h * .02, py - h * .78, h * .025, h * .02);
        };
        if (k === 0) { pessoa(46, 122, 90, true); pessoa(80, 122, 80, false, true); }
        else if (k === 1) { pessoa(30, 120, 76, true); pessoa(54, 120, 70, false, true); pessoa(78, 120, 50, true); pessoa(98, 120, 58, false, true); }
        else if (k === 2) { x.fillStyle = '#4a3622'; x.fillRect(40, 70, 52, 46); x.beginPath(); x.moveTo(34, 72); x.lineTo(66, 46); x.lineTo(98, 72); x.fill(); x.fillStyle = '#1a120a'; x.fillRect(60, 92, 12, 24); x.fillRect(46, 80, 9, 9); x.fillRect(77, 80, 9, 9); x.fillStyle = '#3a2a18'; x.beginPath(); x.arc(24, 64, 16, 0, 7); x.fill(); x.fillRect(22, 70, 4, 50); x.fillStyle = 'rgba(40,28,16,.4)'; x.fillRect(9, 116, 110, 17); }
        else if (k === 3) { pessoa(64, 160, 150, true); }
        else { pessoa(52, 122, 86, false, true); pessoa(78, 124, 46, true); }
        for (let i = 0; i < 25; i++) pinta.mancha(x, R() * 128, R() * 160, 2 + R() * 8, R() < .5 ? '#5a4024' : '#f0e4c8', .2 + R() * .3);
        x.strokeStyle = 'rgba(240,230,210,.45)'; for (let i = 0; i < 10; i++) { x.lineWidth = .6 + R(); x.beginPath(); const sx0 = R() * 128, sy0 = R() * 160; x.moveTo(sx0, sy0); x.lineTo(sx0 + (R() - .5) * 60, sy0 + (R() - .5) * 60); x.stroke(); }
        pinta.grao(x, 128, 160, 1500, .12, 1);
        x.fillStyle = '#e4d6b8'; x.fillRect(0, 0, 128, 9); x.fillRect(0, 133, 128, 27); x.fillRect(0, 0, 9, 160); x.fillRect(119, 0, 9, 160);
        x.strokeStyle = 'rgba(80,60,40,.5)'; x.strokeRect(9, 9, 110, 124);
        return tex(c);
      };
      const matVerso = mat({ color: '#cbbd9e', roughness: .9 }), matBorda = mat({ color: '#d8caa8', roughness: .9 }), matPino = mat({ color: '#2a2420', roughness: .3, metalness: .7 });
      const fotos = [];
      [[1.48, .45, 0], [1.2, -.25, 1], [.98, .55, 2], [.8, -.6, 3], [.62, .2, 4], [1.35, -1.25, 0], [1.05, 1.3, 3], [1.3, 2.6, 1]].forEach(([y, a, k], i) => {
        const p = sup(y, a, .03), n = nrm(y, a), suporte = grupo(corpo, p.x, p.y, p.z);
        orientar(suporte, V(0, 1, 0), n);
        malha(suporte, new T.SphereGeometry(.009, 8, 6), matPino);
        const pend = grupo(suporte, 0, 0, .006); const w = .13 + (k === 3 ? .02 : 0), h = w * 1.25;
        const ft = malha(pend, new T.BoxGeometry(w, h, .002), [matBorda, matBorda, matBorda, matBorda, mat({ map: fotoTex(k), roughness: .7 }), matVerso]);
        ft.position.y = -h / 2 + .012; pend.rotation.z = (R() - .5) * .5; pend.rotation.x = -.08;
        fotos.push({ pend, z0: pend.rotation.z, f: R() * 6 });
      });

      /* ---------- animação ---------- */
      let desl = 0;
      const anim = (dt, t, andando) => {
        desl += ((andando ? 1 : 0) - desl) * Math.min(1, dt * 2.5);
        // desliza devagar, balançando de um lado para o outro
        corpo.position.y = desl * (.02 + Math.sin(t * 2) * .008);
        corpo.rotation.z = Math.sin(t * .5) * .02 + desl * Math.sin(t * 1.6) * .03;
        corpo.rotation.x = desl * .04;
        // os braços apertam devagar e afrouxam; o corpo cede junto
        const aperto = Math.pow(.5 + .5 * Math.sin(t * .9), 2);
        tronco.scale.set(1 - aperto * .03, 1 + aperto * .006, 1 - aperto * .03);
        bracos.forEach(b => { const k = Math.pow(.5 + .5 * Math.sin(t * .9 - b.fase * .15), 2); b.g.scale.set(1 - k * .035, 1, 1 - k * .035); b.g.rotation.y = b.giro * k * .035; });
        // soluço: a cabeça treme e pende
        const solu = Math.max(0, Math.sin(t * 2.6)) * (Math.sin(t * .37) > .3 ? 1 : 0);
        cab.rotation.set(.12 + Math.sin(t * .45) * .03 + solu * .03, Math.sin(t * .3) * .12, .32 + Math.sin(t * .5) * .05 + solu * .02);
        // lágrimas escorrendo
        lagrimas.forEach(l => { const k = ((t * .3 + l.f) % 1); const y = -.004 - k * .07, x2 = l.s2 * (.03 + k * .004); l.l.position.set(x2, y, Math.sqrt(Math.max(0, 1 - Math.pow(x2 / .082, 2) - Math.pow(y / .12, 2))) * .096 + .006); l.l.scale.setScalar(k > .9 ? 1 - (k - .9) * 8 : 1); });
        // os braços da frente alcançam e recuam, os dedos se abrem e fecham
        alcance.forEach((a, i) => {
          const r = .5 + .5 * Math.sin(t * .7 + i * 1.3), al = a.alvo.clone().add(V(a.sx * .04 * r, Math.sin(t * .9 + i) * .03, .1 * r + desl * .12));
          ik(a.br, al, a.polo);
          a.m.curvar([.1 + .35 * (1 - r), .12 + .38 * (1 - r), .14 + .4 * (1 - r), .16 + .45 * (1 - r), .05], .05, t);
        });
        soltas.rotation.x = -desl * .05; soltas.children.forEach((c, i) => { c.rotation.z = Math.sin(t * 1.1 + i) * .015; });
        fotos.forEach(f => { f.pend.rotation.z = f.z0 + Math.sin(t * 1.3 + f.f) * .06 + desl * Math.sin(t * 3 + f.f) * .05; });
        nuc.pulso(t);
      };
      anim(0, 0, false);
      return { g, alt: 2.36, raioBase: .55, anim };
    },
  };
})();

/* ===== forma: olhos_muitos ===== */
/* Forma de Filho: criatura agachada e dobrada sobre si mesma, coberta de olhos.
   Pele cinza-esverdeada enrugada, braços compridos demais enrolados no corpo, dedos que descem até o chão;
   olhos grandes e molhados de pupila em ampulheta nos ombros, nas costas e nos joelhos; no alto, um rosto
   que é só uma boca em anel de dentes com um olho dentro, e um couro cabeludo cheio de olhinhos.
   Parada, as pálpebras piscam fora de ritmo e as pupilas se viram para a frente. */
(() => {
  const NS = window.ACF3D = window.ACF3D || {};

  // utilidades de modelagem (cada forma traz as suas, para o arquivo ser independente)
  function kit(F, sem) {
    const T = F.T, gd = F.guardar, R = F.rng(sem), V = (x, y, z) => new T.Vector3(x, y, z);
    const nz = (x, y, z) => Math.sin(x * 3.1 + Math.sin(y * 2.3 + z)) * Math.cos(y * 2.7 + Math.sin(z * 1.9 + x)) * .6 + Math.sin(z * 4.3 + x * 2.1 + y * 1.3) * .4;
    const malha = (geo, mat, pai, x = 0, y = 0, z = 0) => { const me = new T.Mesh(gd(geo), mat); me.position.set(x, y, z); if (pai) pai.add(me); return me; };
    // normais suaves mesmo na costura da UV (vértices na mesma posição somam as normais)
    function suavizar(geo) {
      geo.computeVertexNormals(); const p = geo.attributes.position, n = geo.attributes.normal, mapa = new Map();
      for (let i = 0; i < p.count; i++) { const k = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`; (mapa.get(k) || mapa.set(k, []).get(k)).push(i); }
      mapa.forEach(l => { if (l.length < 2) return; let x = 0, y = 0, z = 0; l.forEach(i => { x += n.getX(i); y += n.getY(i); z += n.getZ(i); }); const d = Math.hypot(x, y, z) || 1; l.forEach(i => n.setXYZ(i, x / d, y / d, z / d)); });
      return geo;
    }
    function deformar(geo, f, nor = true) { const p = geo.attributes.position, v = new T.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); f(v, i); p.setXYZ(i, v.x, v.y, v.z); } if (nor) suavizar(geo); return geo; }
    // tubo com raio variável ao longo de uma curva (membros, tendões, dedos)
    function tubo(pts, rf, ts = 20, rs = 8, f) {
      const cur = new T.CatmullRomCurve3(pts), geo = new T.TubeGeometry(cur, ts, 1, rs, false);
      const p = geo.attributes.position, c = new T.Vector3(), v = new T.Vector3(); let rm = 0;
      for (let i = 0; i <= ts; i++) { cur.getPointAt(i / ts, c); const r = typeof rf === 'function' ? rf(i / ts) : rf; rm += r;
        for (let j = 0; j <= rs; j++) { const k = i * (rs + 1) + j; v.fromBufferAttribute(p, k).sub(c); const a = j / rs * Math.PI * 2; v.multiplyScalar(r * (f ? 1 + f(i / ts, a) : 1)).add(c); p.setXYZ(k, v.x, v.y, v.z); } }
      const uv = geo.attributes.uv, kk = cur.getLength() / (2 * Math.PI * rm / (ts + 1)); for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * kk);
      if (f) suavizar(geo); return geo;
    }
    const mover = (geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => geo.applyMatrix4(new T.Matrix4().compose(V(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), V(sx, sy, sz)));
    // junta várias geometrias numa só (sem depender de BufferGeometryUtils)
    function juntar(geos) {
      const L = geos.map(g0 => g0.index ? g0.toNonIndexed() : g0); let n = 0; L.forEach(g0 => { n += g0.attributes.position.count; });
      const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0;
      L.forEach(g0 => { const a = g0.attributes; if (!a.normal) g0.computeVertexNormals(); P.set(a.position.array, o * 3); N.set(g0.attributes.normal.array, o * 3); if (a.uv) U.set(a.uv.array, o * 2); o += a.position.count; });
      geos.forEach(g0 => g0.dispose()); L.forEach(g0 => g0.dispose());
      const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(P, 3)); out.setAttribute('normal', new T.BufferAttribute(N, 3)); out.setAttribute('uv', new T.BufferAttribute(U, 2)); return out;
    }
    // núcleo roxo no peito: esfera brilhante numa moldura escura de patas de aranha, com halo
    function nucleo(pai, x, y, z, k = 1, rot = 0) {
      const n = new T.Group(); n.position.set(x, y, z); n.rotation.x = rot; pai.add(n);
      const luz = gd(new T.MeshStandardMaterial({ color: '#3a0a66', emissive: '#8a2be2', emissiveIntensity: 1.6, roughness: .2 }));
      malha(new T.SphereGeometry(.045 * k, 16, 12), luz, n, 0, 0, .012 * k);
      const ferro = gd(new T.MeshStandardMaterial({ color: '#141016', roughness: .45, metalness: .6 }));
      const pecas = [mover(new T.TorusGeometry(.058 * k, .011 * k, 6, 20), 0, 0, .01 * k)];
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .2, c = Math.cos(a), s = Math.sin(a);
        pecas.push(tubo([V(c * .055 * k, s * .055 * k, .01 * k), V(c * .09 * k, s * .09 * k, .03 * k), V(c * .13 * k, s * .13 * k, -.005 * k)], t => (.009 - t * .006) * k, 6, 5)); }
      malha(juntar(pecas), ferro, n);
      const [c, x2] = F.tela(64, 64), gr = x2.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(200,120,255,.9)'); gr.addColorStop(.35, 'rgba(150,60,255,.35)'); gr.addColorStop(1, 'rgba(120,40,255,0)'); x2.fillStyle = gr; x2.fillRect(0, 0, 64, 64);
      const halo = new T.Sprite(gd(new T.SpriteMaterial({ map: F.texCanvas(c), blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: .8 }))); halo.scale.setScalar(.32 * k); halo.position.z = .03 * k; n.add(halo);
      return { pulso: t => { const p = .5 + .5 * Math.sin(t * 1.3) * Math.sin(t * .37 + 1); luz.emissiveIntensity = 1.1 + p * .9; halo.material.opacity = .45 + p * .45; halo.scale.setScalar((.28 + p * .08) * k); } };
    }
    return { T, gd, R, V, nz, malha, suavizar, deformar, tubo, mover, juntar, nucleo };
  }
  (NS.formasFilho = NS.formasFilho || {}).olhos_muitos = {
    nome: 'Olhos (agachada e coberta de olhos)',
    criar: (F, s) => {
      const K = kit(F, 1301), { T, gd, R, V, nz, malha, deformar, tubo, mover, juntar, nucleo } = K;
      const C = h => new T.Color(h).convertSRGBToLinear(); // cor pensada em sRGB
      const g = F.G(), corpo = F.G(); g.add(corpo);

      /* ---------- texturas ---------- */
      // pele: dobras finas horizontais como couro velho, manchas e umidade
      const [cP, xP] = F.tela(512, 512); xP.fillStyle = '#4c5244'; xP.fillRect(0, 0, 512, 512);
      { const r = F.rng(13);
        for (let i = 0; i < 30; i++) { const gx = r() * 512, gy = r() * 512, gr = xP.createRadialGradient(gx, gy, 4, gx, gy, 40 + r() * 80); gr.addColorStop(0, r() < .5 ? 'rgba(110,118,96,.45)' : 'rgba(30,34,26,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); xP.fillStyle = gr; xP.fillRect(gx - 130, gy - 130, 260, 260); }
        for (let i = 0; i < 190; i++) { const y0 = r() * 512, x0 = r() * 512, w = 60 + r() * 220, a = 2 + r() * 5, f = r() * 6;
          for (const dx of [-512, 0, 512]) { xP.beginPath(); for (let xx = 0; xx <= w; xx += 8) xP.lineTo(x0 + dx + xx, y0 + Math.sin(xx / w * Math.PI * 2 + f) * a); xP.strokeStyle = `rgba(18,22,14,${.35 + r() * .35})`; xP.lineWidth = 1 + r() * 1.6; xP.stroke(); xP.translate(0, 2); xP.strokeStyle = 'rgba(150,160,130,.18)'; xP.lineWidth = 1; xP.stroke(); xP.translate(0, -2); } }
        for (let i = 0; i < 2500; i++) { xP.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '200,210,180'},${r() * .08})`; xP.fillRect(r() * 512, r() * 512, 1.5, 1.5); } }
      const pele = gd(new T.MeshStandardMaterial({ map: F.texCanvas(cP, [2, 2]), roughness: .48, metalness: .05, color: C('#c8ccc0') }));
      const peleD = gd(new T.MeshStandardMaterial({ map: F.texCanvas(cP, [1, 3]), roughness: .48, metalness: .05, color: C('#c8ccc0') }));
      // olho: esclera acinzentada com veias, íris âmbar, pupila em ampulheta (frente do olho em u = .25)
      function olhoTex(sem, emis, ir = 26) {
        const k = ir / 26;
        const r = F.rng(sem), [c, x] = F.tela(256, 128), cx = 64, cy = 64;
        if (emis) { x.fillStyle = '#000'; x.fillRect(0, 0, 256, 128); }
        else { const gS = x.createRadialGradient(cx, cy, 10, cx, cy, 90); gS.addColorStop(0, '#d8d2c4'); gS.addColorStop(.6, '#a8a090'); gS.addColorStop(1, '#5a4a48'); x.fillStyle = gS; x.fillRect(0, 0, 256, 128);
          x.strokeStyle = 'rgba(140,30,30,.55)'; for (let i = 0; i < 22; i++) { x.lineWidth = .6 + r(); x.beginPath(); let a = r() * 6.283, d = 70; x.moveTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d * .9); for (let k = 0; k < 6; k++) { d -= 6 + r() * 4; a += (r() - .5) * .4; x.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d * .9); } x.stroke(); } }
        const gI = x.createRadialGradient(cx, cy, 3, cx, cy, ir); gI.addColorStop(0, emis ? '#ffb040' : '#f0b050'); gI.addColorStop(.55, emis ? '#c06010' : '#c87a20'); gI.addColorStop(1, emis ? '#200800' : '#3a1c08');
        x.fillStyle = gI; x.beginPath(); x.arc(cx, cy, ir, 0, 7); x.fill();
        if (!emis) { x.strokeStyle = 'rgba(60,25,5,.5)'; for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283; x.beginPath(); x.moveTo(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7); x.lineTo(cx + Math.cos(a) * (ir - 1), cy + Math.sin(a) * (ir - 1)); x.lineWidth = .7; x.stroke(); } }
        // pupila em ampulheta: dois lóbulos ligados por uma cintura
        x.fillStyle = '#050302'; x.beginPath(); x.ellipse(cx, cy - 9 * k, 6.5 * k, 8 * k, 0, 0, 7); x.ellipse(cx, cy + 9 * k, 6.5 * k, 8 * k, 0, 0, 7); x.fill(); x.fillRect(cx - 2.2 * k, cy - 6 * k, 4.4 * k, 12 * k);
        if (!emis) { x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.ellipse(cx - 10, cy - 12, 4, 2.6, -.5, 0, 7); x.fill(); }
        return F.texCanvas(c);
      }
      const olhoM = gd(new T.MeshStandardMaterial({ map: olhoTex(5, false), emissiveMap: olhoTex(5, true), emissive: '#ffffff', emissiveIntensity: .9, roughness: .06, metalness: .1 }));
      const olhinho = gd(new T.MeshStandardMaterial({ map: olhoTex(9, false, 44), emissiveMap: olhoTex(9, true, 44), emissive: '#ffffff', emissiveIntensity: 1.1, roughness: .1 }));
      const boca = gd(new T.MeshStandardMaterial({ color: C('#1a0606'), roughness: .3 }));
      const gengiva = gd(new T.MeshStandardMaterial({ color: C('#3a1c1c'), roughness: .2 }));
      const dente = gd(new T.MeshStandardMaterial({ color: C('#c8bca0'), roughness: .35 }));
      const baba = gd(new T.MeshStandardMaterial({ color: C('#8a9080'), roughness: .02, metalness: .2, transparent: true, opacity: .55 }));

      /* ---------- corpo dobrado ---------- */
      const tronco = F.G(); tronco.position.set(0, .95, -.05); tronco.rotation.x = .18; corpo.add(tronco);
      const trG = deformar(new T.SphereGeometry(.5, 40, 30), v => {
        v.y *= 1.32; v.z *= .8; v.x *= v.y > .25 ? .98 : .82 - Math.max(0, -v.y) * .1;
        if (v.y < -.35) { v.x *= 1 + (-.35 - v.y) * .9; v.z *= 1 + (-.35 - v.y) * .5; }
        if (v.z < 0 && v.y > -.1) { v.z -= .1 * Math.sin(Math.min(1, (v.y + .1) / .6) * Math.PI) * Math.min(1, -v.z / .3); v.y += .04 * Math.min(1, -v.z / .3); }
        if (Math.abs(v.x) > .2 && v.y > -.3 && v.y < .3) { const d0 = Math.hypot(v.x, v.z) || 1, c = .014 * Math.max(0, Math.sin(v.y * 50)); v.x += v.x / d0 * c; v.z += v.z / d0 * c; }
        // dobras de pele em camadas horizontais e costas curvadas
        const d = Math.hypot(v.x, v.z) || 1, k = Math.sin(v.y * 38 + Math.sin(Math.atan2(v.x, v.z) * 3) * .8) * .012 + nz(v.x * 4, v.y * 4, v.z * 4) * .03;
        v.x += v.x / d * k; v.z += v.z / d * k;
        if (v.z < 0 && Math.abs(v.x) < .07) v.z += .02 * Math.max(0, Math.sin(v.y * 30)); // espinha
      });
      malha(trG, pele, tronco);
      // pregas de pele caídas na barriga e baba pendendo da boca
      const pregas = [];
      for (let i = 0; i < 5; i++) { const y = -.05 - i * .1, w = .3 + i * .03, z0 = .36 + i * .015;
        pregas.push(tubo([V(-w, y + .03, z0 - .14), V(-w * .5, y - .02, z0 - .01), V(0, y - .035, z0 + .01), V(w * .5, y - .02, z0 - .01), V(w, y + .03, z0 - .14)], t => .018 * Math.sin(t * Math.PI) + .004, 20, 6)); }
      malha(juntar(pregas), pele, tronco);

      /* ---------- olhos grandes: globo que gira, pálpebras que piscam ---------- */
      const olhos = [];
      function olhoGrande(pai, pos, dir, r = .1, mat = olhoM) {
        const raiz = F.G(); raiz.position.copy(pos); pai.add(raiz); raiz.lookAt(pos.clone().add(dir)); // +z da raiz aponta para fora
        const glob = F.G(); raiz.add(glob); malha(new T.SphereGeometry(r, 22, 14), mat, glob);
        const tampa = (cima) => { const p = F.G(); raiz.add(p); malha(new T.SphereGeometry(r * 1.045, 18, 7, 0, Math.PI * 2, cima ? 0 : Math.PI / 2, Math.PI / 2), pele, p); return p; };
        const sup = tampa(true), inf = tampa(false);
        const aro = malha(deformar(new T.TorusGeometry(r * 1.12, r * .38, 8, 20), v => { const d = Math.hypot(v.x, v.y) || 1, k = nz(v.x * 30, v.y * 30, 1) * r * .12; v.x += v.x / d * k; v.y += v.y / d * k; }), pele, raiz, 0, 0, -r * .2);
        // lágrima escorrendo
        malha(tubo([V(r * .3, -r * .9, r * .6), V(r * .4, -r * 1.6, r * .55), V(r * .35, -r * 2.6, r * .3)], t => r * .07 * (1 - t * .6), 8, 5), baba, raiz);
        const O = { raiz, glob, sup, inf, aberto: 1, pisca: 1 + R() * 4, fecha: 0, alvo: new T.Vector3(), olhar: new T.Vector3(0, 0, 1), saca: 0, preguica: .5 + R() * 2.5 };
        olhos.push(O); return O;
      }
      const WT = new T.Vector3();
      [-1, 1].forEach(sx => {
        olhoGrande(tronco, V(sx * .4, .42, .15), V(sx * .7, .5, .6), .105);   // ombros
        olhoGrande(tronco, V(sx * .48, .02, -.12), V(sx, .1, -.35), .1);      // flancos/costas
        olhoGrande(tronco, V(sx * .2, .35, -.38), V(sx * .3, .3, -1), .085);  // costas altas
      });
      olhoGrande(tronco, V(0, -.05, -.42), V(0, -.1, -1), .09);               // costas baixas

      /* ---------- cabeça: boca em anel de dentes com um olho dentro, couro cabeludo de olhinhos ---------- */
      const cab = F.G(); cab.position.set(0, .62, .14); cab.rotation.x = -.1; tronco.add(cab);
      const cabG = deformar(new T.SphereGeometry(.24, 32, 24), v => {
        v.y *= 1.25; v.x *= .92; v.z *= .85;
        // a frente se abre num funil (a boca)
        const fr = Math.max(0, v.z / .2), rr = Math.hypot(v.x / .1, (v.y + .02) / .17);
        if (v.z > 0 && rr < 1.25) v.z -= fr * (1.25 - rr) * .1;
        const d = Math.hypot(v.x, v.z) || 1, k = Math.sin(v.y * 45) * .006 + nz(v.x * 9, v.y * 9, v.z * 9) * .012; v.x += v.x / d * k; v.z += v.z / d * k;
      });
      malha(cabG, pele, cab);
      malha(mover(new T.SphereGeometry(.13, 20, 14), 0, 0, 0, 0, 0, 0, .78, 1.3, .5), boca, cab, 0, -.02, .1);
      const anel = [];
      anel.push(mover(new T.TorusGeometry(.115, .025, 8, 30), 0, 0, 0, 0, 0, 0, .85, 1.45, 1));
      malha(juntar(anel), gengiva, cab).position.set(0, -.02, .15);
      malha(deformar(mover(new T.TorusGeometry(.13, .032, 10, 36), 0, 0, 0, 0, 0, 0, .85, 1.42, .8), v => { const a = Math.atan2(v.y, v.x); v.z += Math.sin(a * 7) * .008 + nz(v.x * 30, v.y * 30, 0) * .01; }), pele, cab, 0, -.02, .155);
      const dts = [];
      for (let fila = 0; fila < 2; fila++) for (let i = 0; i < 24; i++) {
        const a = i / 24 * Math.PI * 2 + fila * .13, rx = (.098 - fila * .022) * .85, ry = (.098 - fila * .022) * 1.45, L = .03 + R() * .025 - fila * .006;
        const px = Math.cos(a) * rx, py = Math.sin(a) * ry, dir = V(-px, -py, -.04).normalize();
        const cg = new T.ConeGeometry(.0085, L, 5); cg.translate(0, L / 2, 0);
        cg.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(V(0, 1, 0), dir))); cg.translate(px, py - .02, .15 - fila * .03); dts.push(cg);
      }
      malha(juntar(dts), dente, cab);
      const olhoBoca = olhoGrande(cab, V(0, -.02, .1), V(0, 0, 1), .075);
      const fios = []; [[-.05, -.15], [.035, -.17], [.0, -.16]].forEach(([x0, y0], i) => { const L = .15 + i * .1; fios.push(tubo([V(x0, y0, .16), V(x0 * 1.2, y0 - L * .5, .19), V(x0, y0 - L, .17)], t => .006 - t * .003, 10, 5)); });
      const baba1 = malha(juntar(fios), baba, cab);
      // olhinhos no alto da cabeça
      const pequenos = [];
      const olhoP = gd(new T.SphereGeometry(1, 9, 7)), calo = gd(new T.SphereGeometry(1, 8, 6));
      for (let i = 0; i < 34; i++) {
        const a = (R() - .5) * 2.2, b = .25 + R() * 1.0, rr = .024 + R() * .02;
        const n = V(Math.sin(a) * Math.cos(b * .9), Math.sin(b) * .9 + .25, Math.cos(a) * Math.cos(b * .9) + .2).normalize();
        const p = V(n.x * .22, n.y * .3, n.z * .2); if (p.z > .13 && p.y < .14) continue;
        const ra = F.G(); ra.position.copy(p); cab.add(ra); ra.lookAt(p.clone().multiplyScalar(1.6).add(V(0, .05, .5)));
        const me = new T.Mesh(olhoP, olhinho); me.scale.setScalar(rr); me.position.z = rr * .45; ra.add(me);
        const pal = new T.Mesh(calo, pele); pal.scale.set(rr * 1.15, rr * 1.15, rr * .7); pal.position.z = -rr * 1.05; ra.add(pal);
        pequenos.push({ ra, me, pal, f: R() * 6 });
      }

      /* ---------- pernas dobradas com olhos nos joelhos ---------- */
      [-1, 1].forEach(sx => {
        const coxa = tubo([V(sx * .2, .45, -.15), V(sx * .36, .48, .12), V(sx * .42, .46, .36)], t => .17 - t * .02 + Math.sin(t * Math.PI) * .03, 16, 16, (t, a) => .05 * Math.sin(t * 30 + a * 2) + nz(t * 4, a, sx) * .04);
        const canela = tubo([V(sx * .44, .44, .42), V(sx * .43, .25, .34), V(sx * .4, .08, .22)], t => .11 - t * .03, 12, 12, (t, a) => .04 * Math.sin(t * 25 + a * 2));
        const joelho = deformar(new T.SphereGeometry(.16, 20, 16), v => { v.x += nz(v.x * 12, v.y * 12, v.z * 12) * .012; });
        mover(joelho, sx * .44, .45, .42);
        const pe = deformar(mover(new T.SphereGeometry(.1, 14, 10), sx * .4, .05, .3, 0, 0, 0, 1, .45, 1.7), v => { if (v.y < .0) v.y = 0; });
        const ded = []; for (let i = 0; i < 4; i++) { const a = (i - 1.5) * .22 + sx * .1; ded.push(tubo([V(sx * .4 + Math.sin(a) * .07, .04, .42 + Math.cos(a) * .05), V(sx * .4 + Math.sin(a) * .15, .03, .42 + Math.cos(a) * .14), V(sx * .4 + Math.sin(a) * .2, .005, .42 + Math.cos(a) * .2)], t => .025 - t * .015, 8, 6)); }
        malha(juntar([coxa, canela, joelho, pe, ...ded]), pele, corpo);
        olhoGrande(corpo, V(sx * .52, .47, .5), V(sx * .8, .05, 1), .11);
      });

      /* ---------- braços compridos enrolados no corpo, dedos até o chão ---------- */
      const maos = [];
      [-1, 1].forEach(sx => {
        const zz = sx < 0 ? .06 : 0;
        const braco = tubo([V(sx * .46, 1.3, .02), V(sx * .56, 1.05, .22), V(sx * .5, .84, .44 + zz), V(sx * .15, .75, .57 + zz), V(-sx * .18, .7, .56 + zz)], t => { const cot = Math.exp(-Math.pow((t - .42) / .05, 2)) * .022, bic = Math.sin(Math.min(1, t / .4) * Math.PI) * .012, ante = t > .45 ? Math.sin((t - .45) / .55 * Math.PI) * .01 : 0; return .05 - t * .018 + cot + bic + ante; }, 48, 12, (t, a) => .05 * Math.sin(t * 70 + a * 2) * .5);
        const ombro = deformar(mover(new T.SphereGeometry(.13, 16, 12), sx * .45, 1.3, .0), v => { v.y += nz(v.x * 10, v.y * 10, v.z * 10) * .015; });
        malha(juntar([braco, ombro]), peleD, corpo);
        const mao = F.G(); mao.position.set(-sx * .2, .7, .55 + zz); mao.rotation.set(0, 0, -sx * .2); corpo.add(mao);
        malha(deformar(mover(new T.SphereGeometry(.05, 12, 9), 0, -.03, 0, 0, 0, 0, 1.1, 1.2, .5), v => { v.x += nz(v.x * 40, v.y * 40, 0) * .004; }), pele, mao);
        const dedos = [];
        for (let i = 0; i < 5; i++) {
          const d = F.G(), pol = i === 4; d.position.set(pol ? sx * .05 : (i - 1.5) * .022, pol ? -.02 : -.07, pol ? .02 : 0); d.rotation.set((R() - .5) * .2, 0, (i - 1.5) * .06); mao.add(d);
          const L = pol ? .25 : .5 + R() * .12, ondula = (R() - .5) * .04;
          malha(tubo([V(0, 0, 0), V(ondula, -L * .3, .02), V(-ondula, -L * .6, .04), V(ondula * .5, -L * .9, .05), V(0, -L, .1)], t => .013 - t * .007 + Math.max(0, Math.sin(t * Math.PI * 3)) * .003, 20, 6), pele, d);
          dedos.push(d);
        }
        maos.push({ mao, dedos, sx });
      });

      const nuc = nucleo(tronco, .0, .32, .44, .7, -.35);

      /* ---------- animação ---------- */
      const alvoMundo = new T.Vector3(), tmp = new T.Vector3();
      let fase = 0, quadro = 0, tPose = 0, poseA = 0;
      const anim = (dt, t, andando) => {
        nuc.pulso(t);
        // respira devagar, como algo grande e parado
        const resp = Math.sin(t * .8) * .5 + Math.sin(t * 2.1) * .15;
        tronco.scale.set(1 + resp * .02, 1 + resp * .012, 1 + resp * .025);
        // olhos: piscam fora de ritmo e as pupilas buscam a frente
        g.updateMatrixWorld(true);
        olhos.forEach((O, i) => {
          O.pisca -= dt;
          if (O.pisca <= 0 && O.fecha === 0) { O.fecha = .2; O.pisca = .8 + R() * 5; if (R() < .15) O.pisca = .15; }
          if (O.fecha > 0) { O.fecha -= dt; O.aberto = Math.abs(O.fecha - .1) / .1; if (O.fecha <= 0) { O.fecha = 0; O.aberto = 1; } }
          O.sup.rotation.x = -.95 * O.aberto - .05; O.inf.rotation.x = .75 * O.aberto + .05;
          O.saca -= dt; if (O.saca <= 0) { O.saca = .3 + R() * 1.6; O.alvo.set((R() - .5) * 1.4, 1.1 + (R() - .5) * .7, 3 + R()); if (R() < .45) O.alvo.set(0, 1.4, 4); }
          // a pupila vira para a frente, mas sem passar do limite da órbita
          alvoMundo.copy(O.alvo); g.localToWorld(alvoMundo); O.raiz.worldToLocal(alvoMundo).normalize();
          if (alvoMundo.z < .25) { alvoMundo.z = .25; alvoMundo.normalize(); }
          O.olhar.lerp(alvoMundo, Math.min(1, dt * (O.saca > 1.2 ? 4 : 14))); tmp.copy(O.olhar).normalize();
          O.glob.lookAt(O.raiz.localToWorld(tmp));
        });
        baba1.scale.y = 1 + Math.sin(t * .9) * .15;
        pequenos.forEach((P, i) => { const p = Math.sin(t * 1.3 + P.f) > .985; P.me.scale.y = (p ? .1 : 1) * P.me.scale.x; P.me.rotation.y = Math.sin(t * .7 + P.f) * .5; P.me.rotation.x = Math.sin(t * .9 + P.f * 2) * .3; });
        // dedos: tremores raros
        maos.forEach((M, j) => M.dedos.forEach((d, i) => { d.rotation.x = Math.sin(t * .5 + i + j) * .03 + (Math.sin(t * 6.7 + i * 3 + j) > .96 ? .25 : 0); }));
        if (andando) {
          // anda em "quadros": congela, salta para outra pose, congela de novo
          tPose -= dt; if (tPose <= 0) { tPose = .18 + R() * .25; poseA = R() * 6.283; quadro++; }
          corpo.position.y = .04 + Math.abs(Math.sin(poseA)) * .06; corpo.rotation.z = Math.sin(poseA) * .08; corpo.rotation.x = .05 + Math.cos(poseA) * .05;
          cab.rotation.y = Math.sin(poseA * 3) * .3;
        } else {
          tPose = 0; corpo.position.y *= .8; corpo.rotation.z *= .8; corpo.rotation.x *= .8;
          cab.rotation.y = Math.sin(t * .2) * .08 + (Math.sin(t * 3.1) > .995 ? .4 : 0);
        }
      };
      return { g, alt: 1.82, raioBase: .62, anim };
    },
  };
})();

/* ===== forma: orelhas ===== */
/* Forma de Filho: figura altíssima de túnica cinza esfarrapada, cabeça careca lisa sem rosto e duas orelhas
   humanas enormes. Uma mão ossuda em concha atrás da orelha, o outro braço comprido e pálido pendendo.
   Parada, vira a cabeça devagar, congela de repente e as orelhas tremem. */
(() => {
  const NS = window.ACF3D = window.ACF3D || {};

  // utilidades de modelagem (cada forma traz as suas, para o arquivo ser independente)
  function kit(F, sem) {
    const T = F.T, gd = F.guardar, R = F.rng(sem), V = (x, y, z) => new T.Vector3(x, y, z);
    const nz = (x, y, z) => Math.sin(x * 3.1 + Math.sin(y * 2.3 + z)) * Math.cos(y * 2.7 + Math.sin(z * 1.9 + x)) * .6 + Math.sin(z * 4.3 + x * 2.1 + y * 1.3) * .4;
    const malha = (geo, mat, pai, x = 0, y = 0, z = 0) => { const me = new T.Mesh(gd(geo), mat); me.position.set(x, y, z); if (pai) pai.add(me); return me; };
    // normais suaves mesmo na costura da UV (vértices na mesma posição somam as normais)
    function suavizar(geo) {
      geo.computeVertexNormals(); const p = geo.attributes.position, n = geo.attributes.normal, mapa = new Map();
      for (let i = 0; i < p.count; i++) { const k = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`; (mapa.get(k) || mapa.set(k, []).get(k)).push(i); }
      mapa.forEach(l => { if (l.length < 2) return; let x = 0, y = 0, z = 0; l.forEach(i => { x += n.getX(i); y += n.getY(i); z += n.getZ(i); }); const d = Math.hypot(x, y, z) || 1; l.forEach(i => n.setXYZ(i, x / d, y / d, z / d)); });
      return geo;
    }
    function deformar(geo, f, nor = true) { const p = geo.attributes.position, v = new T.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); f(v, i); p.setXYZ(i, v.x, v.y, v.z); } if (nor) suavizar(geo); return geo; }
    // tubo com raio variável ao longo de uma curva (membros, tendões, dedos)
    function tubo(pts, rf, ts = 20, rs = 8, f) {
      const cur = new T.CatmullRomCurve3(pts), geo = new T.TubeGeometry(cur, ts, 1, rs, false);
      const p = geo.attributes.position, c = new T.Vector3(), v = new T.Vector3(); let rm = 0;
      for (let i = 0; i <= ts; i++) { cur.getPointAt(i / ts, c); const r = typeof rf === 'function' ? rf(i / ts) : rf; rm += r;
        for (let j = 0; j <= rs; j++) { const k = i * (rs + 1) + j; v.fromBufferAttribute(p, k).sub(c); const a = j / rs * Math.PI * 2; v.multiplyScalar(r * (f ? 1 + f(i / ts, a) : 1)).add(c); p.setXYZ(k, v.x, v.y, v.z); } }
      const uv = geo.attributes.uv, kk = cur.getLength() / (2 * Math.PI * rm / (ts + 1)); for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * kk);
      if (f) suavizar(geo); return geo;
    }
    const mover = (geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => geo.applyMatrix4(new T.Matrix4().compose(V(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), V(sx, sy, sz)));
    // junta várias geometrias numa só (sem depender de BufferGeometryUtils)
    function juntar(geos) {
      const L = geos.map(g0 => g0.index ? g0.toNonIndexed() : g0); let n = 0; L.forEach(g0 => { n += g0.attributes.position.count; });
      const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0;
      L.forEach(g0 => { const a = g0.attributes; if (!a.normal) g0.computeVertexNormals(); P.set(a.position.array, o * 3); N.set(g0.attributes.normal.array, o * 3); if (a.uv) U.set(a.uv.array, o * 2); o += a.position.count; });
      geos.forEach(g0 => g0.dispose()); L.forEach(g0 => g0.dispose());
      const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(P, 3)); out.setAttribute('normal', new T.BufferAttribute(N, 3)); out.setAttribute('uv', new T.BufferAttribute(U, 2)); return out;
    }
    // núcleo roxo no peito: esfera brilhante numa moldura escura de patas de aranha, com halo
    function nucleo(pai, x, y, z, k = 1, rot = 0) {
      const n = new T.Group(); n.position.set(x, y, z); n.rotation.x = rot; pai.add(n);
      const luz = gd(new T.MeshStandardMaterial({ color: '#3a0a66', emissive: '#8a2be2', emissiveIntensity: 1.6, roughness: .2 }));
      malha(new T.SphereGeometry(.045 * k, 16, 12), luz, n, 0, 0, .012 * k);
      const ferro = gd(new T.MeshStandardMaterial({ color: '#141016', roughness: .45, metalness: .6 }));
      const pecas = [mover(new T.TorusGeometry(.058 * k, .011 * k, 6, 20), 0, 0, .01 * k)];
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .2, c = Math.cos(a), s = Math.sin(a);
        pecas.push(tubo([V(c * .055 * k, s * .055 * k, .01 * k), V(c * .09 * k, s * .09 * k, .03 * k), V(c * .13 * k, s * .13 * k, -.005 * k)], t => (.009 - t * .006) * k, 6, 5)); }
      malha(juntar(pecas), ferro, n);
      const [c, x2] = F.tela(64, 64), gr = x2.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(200,120,255,.9)'); gr.addColorStop(.35, 'rgba(150,60,255,.35)'); gr.addColorStop(1, 'rgba(120,40,255,0)'); x2.fillStyle = gr; x2.fillRect(0, 0, 64, 64);
      const halo = new T.Sprite(gd(new T.SpriteMaterial({ map: F.texCanvas(c), blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: .8 }))); halo.scale.setScalar(.32 * k); halo.position.z = .03 * k; n.add(halo);
      return { pulso: t => { const p = .5 + .5 * Math.sin(t * 1.3) * Math.sin(t * .37 + 1); luz.emissiveIntensity = 1.1 + p * .9; halo.material.opacity = .45 + p * .45; halo.scale.setScalar((.28 + p * .08) * k); } };
    }
    return { T, gd, R, V, nz, malha, suavizar, deformar, tubo, mover, juntar, nucleo };
  }
  (NS.formasFilho = NS.formasFilho || {}).orelhas = {
    nome: 'Orelhas (túnica longa, cabeça lisa sem rosto)',
    criar: (F, s) => {
      const K = kit(F, 2101), { T, gd, R, V, nz, malha, deformar, tubo, mover, juntar, nucleo } = K;
      const C = h => new T.Color(h).convertSRGBToLinear(); // cor pensada em sRGB
      const g = F.G(), corpo = F.G(); g.add(corpo);

      /* ---------- texturas ---------- */
      // pano cinza velho: trama, escorridos, sujeira subindo da barra; alfa com barra em tiras e furos
      function pano(sem, larg, alt, barra, furos, tiras) {
        const r = F.rng(sem), [c, x] = F.tela(larg, alt);
        x.fillStyle = '#5e6062'; x.fillRect(0, 0, larg, alt);
        for (let i = 0; i < 5000; i++) { x.fillStyle = `rgba(${r() < .5 ? '20,16,12' : '200,190,175'},${r() * .07})`; x.fillRect(r() * larg, r() * alt, 1, 1 + r() * 4); }
        for (let i = 0; i < 60; i++) { const x0 = r() * larg, w = 2 + r() * 10; const gr = x.createLinearGradient(0, 0, 0, alt); gr.addColorStop(0, 'rgba(20,16,12,0)'); gr.addColorStop(r(), `rgba(20,16,12,${.08 + r() * .15})`); gr.addColorStop(1, 'rgba(20,16,12,0)'); x.fillStyle = gr; x.fillRect(x0, 0, w, alt); }
        const gB = x.createLinearGradient(0, alt * .55, 0, alt); gB.addColorStop(0, 'rgba(30,24,18,0)'); gB.addColorStop(1, 'rgba(30,24,18,.75)'); x.fillStyle = gB; x.fillRect(0, 0, larg, alt);
        for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(${r() < .3 ? '60,20,15' : '25,20,15'},${.1 + r() * .2})`; x.beginPath(); x.ellipse(r() * larg, r() * alt, 4 + r() * 25, 3 + r() * 14, r() * 3, 0, 7); x.fill(); }
        const [ca, xa] = F.tela(larg, alt); xa.fillStyle = '#fff'; xa.fillRect(0, 0, larg, alt); xa.fillStyle = '#000';
        xa.beginPath(); xa.moveTo(0, alt);
        for (let xx = 0; xx <= larg; xx += 3 + r() * (tiras ? 6 : 12)) xa.lineTo(xx, alt - alt * (r() < .35 ? r() * .02 : barra * (.3 + r() * .7)));
        xa.lineTo(larg, alt); xa.closePath(); xa.fill();
        for (let i = 0; i < furos; i++) { const cx = r() * larg, cy = alt * (.25 + r() * .6), rr = 2 + r() * 10; xa.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283, q = rr * (.4 + r() * .8); xa.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q * 1.8); } xa.fill(); }
        return { mapa: F.texCanvas(c), alfa: F.texCanvas(ca) };
      }
      const pt = pano(7, 512, 512, .14, 28, false), pm = pano(19, 512, 256, .55, 18, true), pf = pano(31, 128, 256, .5, 4, true);
      const tunica = gd(new T.MeshStandardMaterial({ map: pt.mapa, alphaMap: pt.alfa, alphaTest: .5, side: T.DoubleSide, roughness: .95, color: C('#d0d2d4') }));
      const manto = gd(new T.MeshStandardMaterial({ map: pm.mapa, alphaMap: pm.alfa, alphaTest: .5, side: T.DoubleSide, roughness: .95, color: C('#c4c6c8') }));
      const fita = gd(new T.MeshStandardMaterial({ map: pf.mapa, alphaMap: pf.alfa, alphaTest: .5, side: T.DoubleSide, roughness: .95, color: C('#b4b6b8') }));
      // pele pálida, lisa, um pouco cerosa
      const [cS, xS] = F.tela(256, 256); xS.fillStyle = '#c8bfb2'; xS.fillRect(0, 0, 256, 256);
      { const r = F.rng(43); for (let i = 0; i < 1800; i++) { xS.fillStyle = `rgba(${r() < .5 ? '90,70,60' : '255,250,240'},${r() * .06})`; xS.fillRect(r() * 256, r() * 256, 2, 2); }
        xS.strokeStyle = 'rgba(110,90,120,.18)'; for (let i = 0; i < 14; i++) { xS.lineWidth = .8 + r(); xS.beginPath(); let px = r() * 256, py = r() * 256; xS.moveTo(px, py); for (let k = 0; k < 7; k++) { px += (r() - .5) * 30; py += (r() - .5) * 30; xS.lineTo(px, py); } xS.stroke(); } }
      const pele = gd(new T.MeshStandardMaterial({ map: F.texCanvas(cS, [1, 1]), roughness: .42, color: C('#8c867e') }));
      const fundo = gd(new T.MeshStandardMaterial({ color: C('#4a3634'), roughness: .5 }));

      /* ---------- túnica longa com cauda arrastando ---------- */
      const tronco = F.G(); tronco.rotation.x = .05; corpo.add(tronco);
      const perfil = [[.52, -.02], [.48, .15], [.41, .45], [.33, .8], [.26, 1.15], [.22, 1.45], [.22, 1.7], [.21, 1.85], [.16, 1.95], [.08, 2.03], [.045, 2.06], [.0, 2.065]];
      const tG = new T.LatheGeometry(perfil.map(([a, b]) => new T.Vector2(a, b)), 64, Math.PI);
      deformar(tG, v => {
        const ang = Math.atan2(v.x, v.z), baixo = Math.max(0, 1.6 - v.y) / 1.6;
        const d = 1 + (Math.sin(ang * 9 + nz(v.x * 2, 0, v.z * 2) * 2.5) * .085 + Math.sin(ang * 4 + 1) * .06) * baixo + nz(v.x * 5, v.y * 3, v.z * 5) * .04 * baixo;
        v.x *= d; v.z *= d * .78;
        if (v.z < 0 && v.y < .5) { const k = (.5 - v.y) / .5; v.z -= k * k * .55 * Math.max(0, -v.z / .35); }   // cauda
        if (v.y < .06) v.y = Math.max(0, v.y);
      });
      malha(tG, tunica, tronco);
      // manto curto sobre os ombros, mais rasgado
      const mG = new T.LatheGeometry([[.43, 1.0], [.38, 1.3], [.32, 1.56], [.285, 1.74], [.25, 1.86], [.19, 1.95], [.11, 2.02], [.06, 2.07]].map(([a, b]) => new T.Vector2(a, b)), 56, Math.PI);
      deformar(mG, v => { const ang = Math.atan2(v.x, v.z), baixo = Math.max(0, (2.0 - v.y) / 1.0); const d = 1 + (Math.sin(ang * 7 + v.y * 3) * .1 + Math.sin(ang * 3 + 2) * .06) * baixo + nz(v.x * 6, v.y * 6, v.z * 6) * .04; v.x *= d; v.z *= d * .8; v.y += (Math.sin(ang * 3 + 1) * .14 + Math.sin(ang * 8) * .05) * baixo * baixo; const fr = Math.max(0, Math.cos(ang)); v.y -= fr * fr * .08 * baixo; });
      const mantoM = malha(mG, manto, tronco);
      { const uv = mG.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 2); }
      // tiras de pano soltas que balançam
      const tiras = [];
      for (let i = 0; i < 22; i++) {
        const a = R() * Math.PI * 2, alto = i < 10, rr = alto ? .36 : .44 + R() * .04, y = alto ? 1.2 + R() * .15 : .35 + R() * .5;
        const piv = F.G(); piv.position.set(Math.sin(a) * rr, y, Math.cos(a) * rr * .8); piv.rotation.y = a; tronco.add(piv);
        const h = .2 + R() * .4, w = .04 + R() * .06;
        const me = malha(deformar(new T.PlaneGeometry(w, h, 1, 6), v => { v.z += Math.pow((h / 2 - v.y) / h, 2) * .06; }), fita, piv, 0, -h / 2, .01); me.rotation.y = (R() - .5) * .6;
        tiras.push({ piv, f: R() * 6 });
      }

      /* ---------- pescoço comprido e cabeça lisa ---------- */
      const pesc = F.G(); pesc.position.set(0, 2.0, .03); pesc.rotation.x = .38; tronco.add(pesc);
      malha(juntar([tubo([V(0, -.06, 0), V(0, .1, .01), V(0, .24, .0)], t => .052 - t * .012, 12, 12, (t, a) => .1 * Math.max(0, Math.sin(a * 3)) * (1 - t)),
        ...[-1, 1].map(sx => tubo([V(sx * .04, .22, -.01), V(sx * .03, .1, .03), V(sx * .012, -.03, .05)], .011, 8, 5)),
        tubo([V(0, .2, -.045), V(0, .08, -.055), V(0, -.04, -.05)], .012, 8, 5)]), pele, pesc);
      const cab = F.G(); cab.position.set(0, .26, 0); cab.rotation.x = -.2; pesc.add(cab);
      const cranio = deformar(new T.SphereGeometry(.15, 36, 28), v => {
        v.y *= 1.12; v.z *= .98; v.x *= .86;
        if (v.y < -.05) { const k = (-.05 - v.y) / .12; v.x *= 1 - k * .35; v.z = v.z > 0 ? v.z * (1 - k * .2) : v.z * (1 - k * .4); }
        // só a sombra de um rosto: arcada lisa, nariz quase nada
        if (v.z > .08) { v.z += Math.exp(-Math.pow(v.y / .03, 2)) * Math.exp(-Math.pow(v.x / .06, 2)) * .006 + Math.exp(-Math.pow((v.y + .03) / .05, 2)) * Math.exp(-Math.pow(v.x / .012, 2)) * .008; if (Math.abs(v.x) > .03 && v.y > -.01 && v.y < .03) v.z -= .006; }
      });
      malha(cranio, pele, cab, 0, .14, 0);

      /* ---------- orelhas humanas enormes ---------- */
      function orelha(sx) {
        const o = F.G(); o.position.set(sx * .118, .14, -.01); o.rotation.set(0, sx * -.5, sx * -.08); cab.add(o);
        const pecas = [];
        // concha da orelha: placa grossa com o formato de orelha (larga em cima, estreita no lóbulo)
        pecas.push(deformar(new T.SphereGeometry(.1, 20, 18), v => {
          const y = v.y * 1.6, k = y > 0 ? 1 : 1 - Math.min(.55, -y * 2.2);
          v.y = y; v.z = v.z * k - .02 * (1 - y * 2); v.x *= .22;
          v.x += sx * (Math.exp(-Math.pow((v.y + .01) / .07, 2)) * Math.exp(-Math.pow((v.z + .03) / .045, 2)) * -.02);
        }));
        pecas.push(tubo([V(0, .02, .06), V(sx * .012, .14, .03), V(sx * .02, .17, -.04), V(sx * .022, .12, -.11), V(sx * .02, .02, -.125), V(sx * .015, -.09, -.1), V(sx * .01, -.14, -.06)], t => .02 - t * .004, 30, 8));
        pecas.push(tubo([V(sx * .012, .1, -.02), V(sx * .02, .06, -.075), V(sx * .02, -.03, -.08), V(sx * .015, -.07, -.05)], .011, 14, 6));
        pecas.push(mover(new T.SphereGeometry(.03, 10, 8), sx * .006, -.15, -.045, 0, 0, 0, .55, 1.1, 1));
        pecas.push(mover(new T.SphereGeometry(.018, 8, 6), sx * .01, -.03, .05, 0, 0, 0, .8, 1.2, .9)); // trago
        malha(juntar(pecas), pele, o);
        malha(mover(new T.SphereGeometry(.03, 12, 9), 0, 0, 0, 0, 0, 0, .25, 1.15, .9), fundo, o, sx * .003, -.03, -.03);
        o.scale.setScalar(1.25);
        return o;
      }
      const orelhas = [orelha(-1), orelha(1)];

      /* ---------- braços: um em concha atrás da orelha, outro pendendo até o joelho ---------- */
      function mao(pai, L, curva, abre) {
        const m = F.G(); pai.add(m);
        malha(deformar(mover(new T.SphereGeometry(.045, 12, 9), 0, -.055, 0, 0, 0, 0, .9, 1.4, .32), v => { v.z += Math.sin(v.x * 80) * .002; }), pele, m);
        const dedos = [];
        for (let i = 0; i < 5; i++) {
          const pol = i === 4, d = F.G(); d.position.set(pol ? .045 : (i - 1.5) * .022, pol ? -.04 : -.115, pol ? .02 : 0); d.rotation.set(0, 0, pol ? .7 : (i - 1.5) * abre); m.add(d);
          const l = pol ? L * .55 : L * (i === 1 || i === 2 ? 1 : .88);
          const ossos = [tubo([V(0, 0, 0), V(0, -l * .38, curva * .3), V(0, -l * .7, curva * .9), V(0, -l, curva * 1.8)], t => .0075 - t * .0035, 12, 6)];
          [.38, .7].forEach(q => ossos.push(mover(new T.SphereGeometry(.0095, 6, 5), 0, -l * q, curva * (q > .5 ? .9 : .3))));
          malha(juntar(ossos), pele, d); dedos.push(d);
        }
        // tendões nas costas da mão
        malha(juntar([0, 1, 2, 3].map(i => tubo([V((i - 1.5) * .01, -.01, -.012), V((i - 1.5) * .02, -.1, -.014)], .004, 4, 4))), pele, m);
        return { m, dedos };
      }
      // braço pendente (lado -x): manga até o cotovelo, antebraço nu e comprido
      const bP = F.G(); bP.position.set(-.31, 1.83, .05); bP.rotation.set(.05, 0, -.13); tronco.add(bP);
      malha(deformar(new T.CylinderGeometry(.06, .15, .6, 28, 8, true), v => { const a = Math.atan2(v.x, v.z), k = (.3 - v.y) / .6; const d = 1 + Math.sin(a * 6) * .12 * k + nz(v.x * 9, v.y * 9, v.z * 9) * .1; v.x *= d; v.z *= d; v.z += k * k * .06; v.y += Math.sin(a * 3) * .04 * k; }), manto, bP, 0, -.33, .02);
      malha(deformar(new T.SphereGeometry(.085, 14, 10), v => { v.y *= .8; v.x += nz(v.x * 20, v.y * 20, v.z * 20) * .015; v.z += nz(v.z * 20, v.x * 20, 1) * .015; }), tunica, bP, .01, -.04, .01);
      malha(juntar([tubo([V(0, -.05, 0), V(-.01, -.3, .04), V(0, -.52, .07)], t => .04 - t * .008, 12, 10), tubo([V(0, -.52, .07), V(.008, -.78, .12), V(.0, -1.02, .15)], t => .032 - t * .012 + Math.exp(-Math.pow((t - .97) / .05, 2)) * .008, 18, 10, (t, a) => .1 * Math.max(0, Math.sin(a * 2)) * Math.sin(t * Math.PI)), mover(new T.SphereGeometry(.036, 10, 8), 0, -.52, .07)]), pele, bP);
      const maoP = mao(bP, .2, .012, .1); maoP.m.position.set(0, -1.03, .15); maoP.m.rotation.set(.05, -.4, 0);
      // braço erguido (lado +x): cotovelo para a frente, mão em concha atrás da orelha (o antebraço acompanha a cabeça)
      const bE = F.G(); bE.position.set(.27, 1.86, .02); tronco.add(bE);
      const cotovelo = V(.12, -.3, .3);
      malha(deformar(new T.CylinderGeometry(.05, .1, .22, 22, 5, true), v => { const a = Math.atan2(v.x, v.z), k = (.11 - v.y) / .22; const d = 1 + Math.sin(a * 5) * .15 * k + nz(v.x * 12, v.y * 12, v.z * 12) * .12; v.x *= d; v.z *= d; }), manto, bE, cotovelo.x, cotovelo.y - .02, cotovelo.z).rotation.set(.5, 0, .2);
      malha(juntar([tubo([V(0, -.03, 0), V(.07, -.17, .16), cotovelo], t => .042 - t * .006, 14, 10), mover(new T.SphereGeometry(.038, 10, 8), cotovelo.x, cotovelo.y, cotovelo.z)]), pele, bE);
      malha(deformar(new T.CylinderGeometry(.07, .15, .3, 18, 4, true), v => { v.x += nz(v.x * 9, v.y * 9, v.z * 9) * .025; }), manto, bE, .035, -.1, .07).rotation.set(-.9, 0, .25);
      // antebraço: rádio e ulna como dois ossos esticados entre o cotovelo e o punho (refeitos a cada quadro)
      const unit = gd(new T.CylinderGeometry(.32, .5, 1, 10, 4)); unit.translate(0, .5, 0); deformar(unit, v => { const k = Math.exp(-Math.pow((v.y - .12) / .12, 2)) * .25; v.x *= 1 + k; v.z *= 1 + k * .6; });
      const ossoA = new T.Mesh(unit, pele), ossoB = new T.Mesh(unit, pele); bE.add(ossoA); bE.add(ossoB);
      const punho = F.G(); punho.position.set(.16, -.03, -.115); cab.add(punho);
      malha(mover(new T.SphereGeometry(.028, 10, 8), 0, 0, 0, 0, 0, 0, 1.1, 1, .8), pele, punho);
      const maoE = mao(punho, .22, .07, .16); maoE.m.rotation.set(-.35, -1.1, Math.PI + .1); maoE.m.position.set(0, .0, 0);

      const nuc = nucleo(tronco, .02, 1.72, .225, .75, -.05);

      /* ---------- animação: cabeça que gira e congela ---------- */
      const W1 = new T.Vector3(), W2 = new T.Vector3(), Q = new T.Quaternion(), UP = V(0, 1, 0);
      const estica = (me, a, b, r0, r1) => { const d = W2.subVectors(b, a), L = d.length(); me.position.copy(a); me.quaternion.setFromUnitVectors(UP, d.normalize()); me.scale.set(r0 * 2, L, r1 * 2); };
      let estado = 'para', tEst = 2.2, de = { y: 0, x: -.2, z: 0 }, para = { y: 0, x: -.2, z: 0 }, cur = { y: 0, x: -.2, z: 0 }, dur = 1, prog = 1, fase = 0;
      const tremor = [0, 0];
      const anim = (dt, t, andando) => {
        nuc.pulso(t);
        // vira devagar, congela; às vezes um estalo rápido para o lado de um som
        tEst -= dt;
        if (tEst <= 0) {
          de = { ...cur };
          const estalo = R() < .2;
          para = { y: (R() - .5) * 1.5, x: -.2 + (R() - .5) * .5, z: (R() - .5) * .7 };
          dur = estalo ? .18 : 1.4 + R() * 1.4; prog = 0; tEst = dur + 1.4 + R() * 3.2;
          if (R() < .5) tremor[R() < .5 ? 0 : 1] = 1;
        }
        if (prog < 1) { prog = Math.min(1, prog + dt / dur); const e = prog * prog * (3 - 2 * prog); ['y', 'x', 'z'].forEach(k => { cur[k] = de[k] + (para[k] - de[k]) * e; }); }
        else if (Math.sin(t * 9) > .97 && R() < .05) tremor[R() < .5 ? 0 : 1] = .7;
        pesc.rotation.y = cur.y * .45; cab.rotation.y = cur.y * .55; cab.rotation.x = cur.x; cab.rotation.z = cur.z;
        // orelhas: tremidas rápidas que somem
        orelhas.forEach((o, i) => { tremor[i] = Math.max(0, tremor[i] - dt * 3); const sx = i ? 1 : -1; o.rotation.y = sx * -.5 + Math.sin(t * 40 + i) * .12 * tremor[i]; o.rotation.z = sx * -.08 + Math.sin(t * 33) * .06 * tremor[i]; });
        // antebraço erguido: do cotovelo até o punho que acompanha a cabeça
        g.updateMatrixWorld(true);
        W1.copy(cotovelo); punho.getWorldPosition(W2); bE.worldToLocal(W2); const pP = W2.clone();
        estica(ossoA, V(cotovelo.x + .014, cotovelo.y, cotovelo.z), V(pP.x + .011, pP.y, pP.z), .034, .03);
        estica(ossoB, V(cotovelo.x - .016, cotovelo.y, cotovelo.z - .012), V(pP.x - .009, pP.y, pP.z - .01), .026, .022);
        maoE.dedos.forEach((d, i) => { d.rotation.x = .3 + Math.sin(t * .7 + i) * .05 + (prog < 1 ? .15 : 0); });
        maoP.dedos.forEach((d, i) => { d.rotation.x = Math.sin(t * .9 + i * .8) * .08 + (Math.sin(t * 5.3 + i) > .97 ? .3 : 0); });
        // respiração lenta, panos balançando
        const resp = Math.sin(t * .7);
        mantoM.scale.set(1 + resp * .012, 1, 1 + resp * .015);
        tiras.forEach((T0, i) => { T0.piv.rotation.x = Math.sin(t * 1.2 + T0.f) * (andando ? .22 : .06); T0.piv.rotation.z = Math.sin(t * .8 + T0.f * 2) * .04; });
        if (andando) {
          // desliza sem passos: nada sobe e desce, só o pano ondula e o corpo se inclina para a frente
          fase += dt * 2.2; tronco.rotation.x = .12 + Math.sin(fase) * .02; tronco.rotation.z = Math.sin(fase * .5) * .03;
          bP.rotation.x = .15 + Math.sin(fase) * .08;
        } else { tronco.rotation.x += (.05 - tronco.rotation.x) * .05; tronco.rotation.z *= .95; bP.rotation.x += (.05 + Math.sin(t * .5) * .03 - bP.rotation.x) * .05; }
      };
      return { g, alt: 2.62, raioBase: .55, anim };
    },
  };
})();

/* ===== forma: retalhos_quadrupede ===== */
/* Forma de Filho: quadrúpede de retalhos.
   Corpo enorme e corcunda feito de retalhos de pano e pele (vermelho e bege) com costuras em cruz,
   cabeça redonda de boneco pendurada baixa, membros desiguais (duas patas pesadas e dois braços
   finos com garras), tiras de pano pingando. Anda de quatro, pesado e torto. */
(() => {
  const NS = window.ACF3D = window.ACF3D || {};
  (NS.formasFilho = NS.formasFilho || {}).retalhos_quadrupede = {
    nome: 'Retalhos de quatro (boneco de pano costurado)',
    criar: (F, s) => {
      const T = F.T, g = F.G(), guardar = F.guardar, rng = F.rng || NS.rng, tela = F.tela || NS.tela;
      const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z), CIMA = V3(0, 1, 0);
      const mat = o => guardar(new T.MeshStandardMaterial(o));
      const R = rng(2207);

      /* ================= utilidades ================= */
      // ruído suave feito de senos (determinístico)
      const ruido = (x, y, z, k = 0) => Math.sin(1.7 * x + 1.3 * y + k) * Math.sin(1.9 * y - 1.1 * z + 2 * k) * Math.sin(1.3 * z + .7 * x + 3 * k)
        + .5 * Math.sin(3.1 * x - 2.3 * z + k) * Math.sin(2.9 * y + 1.7 * x - k);
      // junta várias geometrias numa só (com grupos de material), sem depender de bibliotecas extras
      function juntar(lista) {
        lista.sort((a, b) => (a[1] || 0) - (b[1] || 0));
        let nv = 0, ni = 0;
        lista.forEach(([q]) => { nv += q.attributes.position.count; ni += q.index ? q.index.count : q.attributes.position.count; });
        const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = nv > 65000 ? new Uint32Array(ni) : new Uint16Array(ni);
        const out = new T.BufferGeometry(); let ov = 0, oi = 0, gr = -1, ini = 0;
        lista.forEach(([q, grupo = 0]) => {
          if (!q.attributes.normal) q.computeVertexNormals();
          const n = q.attributes.position.count;
          pos.set(q.attributes.position.array, ov * 3); nor.set(q.attributes.normal.array, ov * 3);
          if (q.attributes.uv) uv.set(q.attributes.uv.array, ov * 2);
          const ix = q.index ? q.index.array : Array.from({ length: n }, (_, i) => i);
          if (grupo !== gr) { if (gr >= 0) out.addGroup(ini, oi - ini, gr); gr = grupo; ini = oi; }
          for (let k = 0; k < ix.length; k++) idx[oi + k] = ix[k] + ov;
          oi += ix.length; ov += n; q.dispose();
        });
        out.addGroup(ini, oi - ini, gr);
        out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nor, 3)); out.setAttribute('uv', new T.BufferAttribute(uv, 2));
        out.setIndex(new T.BufferAttribute(idx, 1)); out.computeBoundingSphere();
        return guardar(out);
      }
      // empurra os vértices ao longo da normal com ruído (deixa a forma orgânica)
      function amassar(q, amp, freq, k) {
        const p = q.attributes.position, nn = q.attributes.normal;
        for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = ruido(x * freq, y * freq, z * freq, k) * amp; p.setXYZ(i, x + nn.getX(i) * d, y + nn.getY(i) * d, z + nn.getZ(i) * d); }
        q.computeVertexNormals(); return q;
      }
      // tubo com raio variável ao longo da curva (raio = função de 0 a 1)
      function tubo(pts, raio, seg = 16, rad = 8) {
        const curva = new T.CatmullRomCurve3(pts), q = new T.TubeGeometry(curva, seg, 1, rad, false);
        const p = q.attributes.position, c = V3(), v = V3();
        for (let i = 0; i <= seg; i++) { curva.getPointAt(i / seg, c); const k = typeof raio === 'function' ? raio(i / seg) : raio; for (let j = 0; j <= rad; j++) { const n = i * (rad + 1) + j; v.fromBufferAttribute(p, n).sub(c).multiplyScalar(k).add(c); p.setXYZ(n, v.x, v.y, v.z); } }
        return q;
      }
      // osso de torno ao longo de +y (0 até L), perfil r(t)
      function torno(L, perfil, rad = 14, n = 10) {
        const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new T.Vector2(Math.max(.002, perfil(t)), t * L)); }
        return new T.LatheGeometry(pts, rad);
      }
      // IK de dois ossos: devolve o joelho/cotovelo entre o ombro H e o alvo P
      function ik(H, P, a, b, polo, out) {
        const d = P.clone().sub(H); let L = d.length(); L = Math.min(Math.max(L, Math.abs(a - b) + .01), a + b - .001);
        d.normalize(); const x = (a * a - b * b + L * L) / (2 * L), h = Math.sqrt(Math.max(0, a * a - x * x));
        const pp = polo.clone().sub(d.clone().multiplyScalar(polo.dot(d))).normalize();
        return out.copy(H).addScaledVector(d, x).addScaledVector(pp, h);
      }
      const apontar = (o, a, b) => { o.position.copy(a); o.quaternion.setFromUnitVectors(CIMA, b.clone().sub(a).normalize()); };
      // pulso curto de 0 a 1 que acontece de tempos em tempos (tique)
      const tique = (t, per, dur, fase = 0) => { const p = ((t + fase) % per) / dur; return p < 1 ? Math.sin(p * Math.PI) : 0; };

      /* ================= texturas ================= */
      // retalhos costurados (cor + relevo das costuras)
      function texRetalhos(sem, paleta, base, nRet) {
        const N = 512, [c, x] = tela(N, N), [cb, xb] = tela(N, N), r = rng(sem);
        x.fillStyle = base; x.fillRect(0, 0, N, N); xb.fillStyle = '#7a7a7a'; xb.fillRect(0, 0, N, N);
        const costura = (ax, ay, bx2, by) => {
          const dx = bx2 - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, tx = dx / L, ty = dy / L, passo = 13 + r() * 7;
          for (let d = passo * .6; d < L - 3; d += passo) {
            const px = ax + tx * d, py = ay + ty * d, k = 5 + r() * 3, w = 2 + r() * 2;
            for (const [cx2, cor, sombra] of [[x, '#d9caa6', 'rgba(20,4,4,.8)'], [xb, '#ffffff', null]]) {
              cx2.lineCap = 'round';
              if (sombra) { cx2.strokeStyle = sombra; cx2.lineWidth = 2.6; cx2.beginPath(); cx2.moveTo(px - nx * k - tx * w + 1, py - ny * k - ty * w + 1); cx2.lineTo(px + nx * k + tx * w + 1, py + ny * k + ty * w + 1); cx2.moveTo(px - nx * k + tx * w + 1, py - ny * k + ty * w + 1); cx2.lineTo(px + nx * k - tx * w + 1, py + ny * k - ty * w + 1); cx2.stroke(); }
              cx2.strokeStyle = cor; cx2.lineWidth = 1.6; cx2.beginPath();
              cx2.moveTo(px - nx * k - tx * w, py - ny * k - ty * w); cx2.lineTo(px + nx * k + tx * w, py + ny * k + ty * w);
              cx2.moveTo(px - nx * k + tx * w, py - ny * k + ty * w); cx2.lineTo(px + nx * k - tx * w, py + ny * k - ty * w); cx2.stroke();
              // furinhos da agulha
              if (sombra) { cx2.fillStyle = '#140404'; [[-1, -1], [1, 1], [-1, 1], [1, -1]].forEach(([a2, b2]) => { cx2.fillRect(px + nx * k * a2 + tx * w * b2 - 1, py + ny * k * a2 + ty * w * b2 - 1, 2, 2); }); }
            }
          }
        };
        for (let i = 0; i < nRet; i++) {
          const cx0 = r() * N, cy0 = r() * N, rr = 60 + r() * 95, nl = 4 + Math.floor(r() * 3), a0 = r() * 6.28, cor = paleta[Math.floor(r() * paleta.length)];
          const pts = []; for (let k = 0; k < nl; k++) { const a = a0 + k / nl * 6.283 + (r() - .5) * .5, rd = rr * (.65 + r() * .5); pts.push([Math.cos(a) * rd, Math.sin(a) * rd * (.6 + r() * .7)]); }
          [-N, 0, N].forEach(off => {
            const ox = cx0 + off;
            if (ox < -150 || ox > N + 150) return;
            const caminho = cx2 => { cx2.beginPath(); pts.forEach(([a, b], k) => k ? cx2.lineTo(ox + a, cy0 + b) : cx2.moveTo(ox + a, cy0 + b)); cx2.closePath(); };
            x.save(); caminho(x); x.fillStyle = cor; x.fill(); x.clip();
            // trama do pano e manchas internas
            x.globalAlpha = .07; x.strokeStyle = r() < .5 ? '#000' : '#fff'; x.lineWidth = 1;
            for (let k = -200; k < 200; k += 4) { x.beginPath(); x.moveTo(ox + k, cy0 - 200); x.lineTo(ox + k + 60, cy0 + 200); x.stroke(); }
            x.globalAlpha = 1;
            const gr = x.createRadialGradient(ox + (r() - .5) * rr, cy0 + (r() - .5) * rr, 4, ox, cy0, rr * 1.3);
            gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(25,5,5,${.25 + r() * .3})`); x.fillStyle = gr; x.fillRect(ox - 200, cy0 - 200, 400, 400);
            for (let k = 0; k < 6; k++) { x.fillStyle = `rgba(${r() < .5 ? '60,10,10' : '230,210,180'},${.05 + r() * .1})`; x.beginPath(); x.ellipse(ox + (r() - .5) * rr, cy0 + (r() - .5) * rr, 3 + r() * 14, 2 + r() * 8, r() * 3, 0, 7); x.fill(); }
            x.restore();
            caminho(x); x.strokeStyle = 'rgba(30,6,6,.85)'; x.lineWidth = 2.5; x.stroke();
            caminho(xb); xb.fillStyle = `rgb(${120 + r() * 40 | 0},${120 + r() * 40 | 0},${120 + r() * 40 | 0})`; xb.fill(); xb.strokeStyle = '#2a2a2a'; xb.lineWidth = 4; xb.stroke();
            pts.forEach(([a, b], k) => { if (r() < .7) { const [a2, b2] = pts[(k + 1) % nl]; costura(ox + a, cy0 + b, ox + a2, cy0 + b2); } });
          });
        }
        // rasgos escuros e escorridos
        for (let i = 0; i < 9; i++) {
          const cx0 = r() * N, cy0 = r() * N, w = 6 + r() * 16, h = 10 + r() * 30;
          for (const [cx2, cor] of [[x, '#160405'], [xb, '#000000']]) { cx2.fillStyle = cor; cx2.beginPath(); for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283, rd = .6 + r() * .5; cx2.lineTo(cx0 + Math.cos(a) * w * rd, cy0 + Math.sin(a) * h * rd); } cx2.fill(); }
        }
        for (let i = 0; i < 40; i++) { const x0 = r() * N, y0 = r() * N, L = 20 + r() * 90; const gr = x.createLinearGradient(0, y0, 0, y0 + L); gr.addColorStop(0, 'rgba(40,6,8,.35)'); gr.addColorStop(1, 'rgba(40,6,8,0)'); x.fillStyle = gr; x.fillRect(x0, y0, 2 + r() * 4, L); }
        const map = F.texCanvas(c), bump = F.texCanvas(cb); bump.encoding = T.LinearEncoding;
        map.wrapS = map.wrapT = bump.wrapS = bump.wrapT = T.RepeatWrapping;
        return { map, bump };
      }
      // atadura de pano sujo
      function texAtadura() {
        const [c, x] = tela(256, 256), r = rng(41);
        x.fillStyle = '#d6c8ad'; x.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 256; y += 3) { x.fillStyle = `rgba(${r() < .5 ? '90,70,50' : '255,250,235'},${.05 + r() * .08})`; x.fillRect(0, y, 256, 1); }
        for (let i = 0; i < 9; i++) { x.strokeStyle = 'rgba(70,50,35,.55)'; x.lineWidth = 2; const y0 = r() * 256; x.beginPath(); x.moveTo(0, y0); x.lineTo(256, y0 + (r() - .5) * 60); x.stroke(); }
        for (let i = 0; i < 7; i++) { const gr = x.createRadialGradient(0, 0, 2, 0, 0, 30 + r() * 40); gr.addColorStop(0, 'rgba(110,20,18,.75)'); gr.addColorStop(.6, 'rgba(120,40,25,.35)'); gr.addColorStop(1, 'rgba(120,40,25,0)'); x.save(); x.translate(r() * 256, r() * 256); x.scale(1, .5 + r()); x.fillStyle = gr; x.fillRect(-80, -80, 160, 160); x.restore(); }
        for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(40,30,20,${r() * .12})`; x.fillRect(r() * 256, r() * 256, 2, 2); }
        const t = F.texCanvas(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
      }
      // tiras de pano rasgadas (8 colunas com ponta irregular e transparência)
      function texTiras() {
        const N = 512, [c, x] = tela(N, N), r = rng(77), cols = ['#8e2a2c', '#d2b89c', '#a63a3c', '#c49a86', '#6e1c20', '#dcc8ae', '#9a3436', '#b98a78'];
        for (let i = 0; i < 8; i++) {
          const x0 = i * 64;
          x.fillStyle = cols[i]; x.beginPath(); x.moveTo(x0 + 4, 0); x.lineTo(x0 + 60, 0);
          let y = N * (.55 + r() * .2); x.lineTo(x0 + 56 + r() * 6, y);
          for (let k = 0; k < 5; k++) { const px = x0 + 56 - k * 11 - r() * 5, py = y + (k % 2 ? -r() * 60 : 20 + r() * 150); x.lineTo(px, Math.min(N - 2, py)); }
          x.lineTo(x0 + 4 + r() * 6, y * .9); x.closePath(); x.fill();
          x.save(); x.clip();
          for (let k = 0; k < 140; k++) { x.fillStyle = `rgba(${r() < .5 ? '30,5,5' : '255,240,220'},${r() * .08})`; x.fillRect(x0 + r() * 64, r() * N, 2, 6 + r() * 20); }
          const gr = x.createLinearGradient(0, 0, 0, N); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(.4, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(40,0,0,.45)'); x.fillStyle = gr; x.fillRect(x0, 0, 64, N);
          x.strokeStyle = '#ece0c4'; x.lineWidth = 1.5;
          if (r() < .6) for (let y2 = 20; y2 < 200; y2 += 14) { x.beginPath(); x.moveTo(x0 + 6, y2); x.lineTo(x0 + 14, y2 + 6); x.moveTo(x0 + 14, y2); x.lineTo(x0 + 6, y2 + 6); x.stroke(); }
          x.restore();
        }
        return F.texCanvas(c);
      }

      const tRet = texRetalhos(11, ['#8a2226', '#a5323a', '#6e1a1e', '#b34a48', '#7d2a2a', '#d9c2a6', '#cdb092', '#e3d0b8', '#c98a80', '#b87468'], '#5a1a1c', 30);
      const tCab = texRetalhos(23, ['#dcc6aa', '#cfb496', '#e6d4bc', '#c8a88c', '#d8bea0'], '#b89c80', 12);
      const tAtad = texAtadura(), tTiras = texTiras();
      // rosto: o mesmo pano bege, com escorridos escuros saindo dos olhos e da boca
      const tRosto = texRetalhos(23, ['#dcc6aa', '#cfb496', '#e6d4bc', '#c8a88c', '#d8bea0'], '#b89c80', 12);
      { const x = tRosto.map.image.getContext('2d'), r = rng(9);
        [[97, 223], [159, 225], [132, 317]].forEach(([cx0, cy0], k) => {
          const gr = x.createRadialGradient(cx0, cy0, 4, cx0, cy0, k < 2 ? 26 : 40); gr.addColorStop(0, 'rgba(30,6,4,.8)'); gr.addColorStop(1, 'rgba(30,6,4,0)'); x.fillStyle = gr; x.fillRect(cx0 - 50, cy0 - 50, 100, 100);
          for (let i = 0; i < (k < 2 ? 4 : 7); i++) { const x0 = cx0 + (r() - .5) * (k < 2 ? 20 : 50), L = 40 + r() * 110, w = 2 + r() * 4, g2 = x.createLinearGradient(0, cy0, 0, cy0 + L); g2.addColorStop(0, 'rgba(70,8,6,.85)'); g2.addColorStop(1, 'rgba(70,8,6,0)'); x.fillStyle = g2; x.beginPath(); x.moveTo(x0 - w / 2, cy0); x.quadraticCurveTo(x0 + (r() - .5) * 8, cy0 + L * .6, x0, cy0 + L); x.quadraticCurveTo(x0 + w, cy0 + L * .5, x0 + w / 2, cy0); x.fill(); }
        }); }

      const mPano = mat({ color: '#c4b0a6', map: tRet.map, bumpMap: tRet.bump, bumpScale: .2, roughness: .93, metalness: 0 });
      const mPanoB = mat({ color: '#d4c6b6', map: tCab.map, bumpMap: tCab.bump, bumpScale: .3, roughness: .9 });
      const mCab = mat({ color: '#d8ccc0', map: tRosto.map, bumpMap: tCab.bump, bumpScale: .35, roughness: .9 });
      const mAtad = mat({ color: '#ffffff', map: tAtad, roughness: .95 });
      const mTira = mat({ color: '#ffffff', map: tTiras, alphaTest: .5, side: T.DoubleSide, roughness: .95 });
      const mLinha = mat({ color: '#a89878', roughness: .8 });
      const mGarra = mat({ color: '#141010', roughness: .3, metalness: .2 });
      const mBotao = mat({ color: '#231915', roughness: .3, metalness: .25 });
      const mBuraco = mat({ color: '#050202', roughness: 1 });
      const mOlho = mat({ color: '#200000', emissive: '#c00000', emissiveIntensity: 1.2, roughness: .4 });

      const corpo = F.G(); g.add(corpo);
      const torsoG = F.G(); torsoG.position.set(0, 1.45, -.05); torsoG.rotation.x = -.12; corpo.add(torsoG);

      /* ================= tronco corcunda ================= */
      // forma do tronco a partir de uma direção unitária (u = esfera)
      const forma = (ux, uy, uz) => {
        const fz = (uz + 1) / 2;
        let X = ux * .8 * (.78 + .34 * fz), Y = uy * .6, Z = uz * 1.32;
        if (uy > 0 && uz < 0) Y *= 1 + .3 * uz;                               // anca mais baixa que os ombros
        Y += Math.max(0, uy) * .36 * Math.exp(-((uz - .25) ** 2) / .22);    // corcunda nos ombros
        if (uy < 0) Y *= 1 + .3 * Math.exp(-((uz + .1) ** 2) / .3);          // barriga caída
        X *= 1 + .1 * Math.max(0, -uy);
        const n = ruido(X * 3, Y * 3, Z * 3, 1) * .05 + ruido(X * 8, Y * 8, Z * 8, 4) * .012;
        return V3(X + ux * n, Y + uy * n, Z + uz * n);
      };
      // polos da esfera escondidos: um sob o pescoço, outro sob a anca
      const qTorso = new T.SphereGeometry(1, 64, 44); qTorso.rotateX(1.04); const pT = qTorso.attributes.position;
      for (let i = 0; i < pT.count; i++) { const v = forma(pT.getX(i), pT.getY(i), pT.getZ(i)); pT.setXYZ(i, v.x, v.y, v.z); }
      qTorso.computeVertexNormals();
      const uvT = qTorso.attributes.uv; for (let i = 0; i < uvT.count; i++) uvT.setXY(i, uvT.getX(i) * 2, uvT.getY(i) * 1.3);
      const torso = new T.Mesh(guardar(qTorso), mPano); torsoG.add(torso);
      // ponto na pele do tronco (no espaço do corpo) e a normal aproximada
      torsoG.updateMatrix();
      const naPele = (ux, uy, uz, fora = 0) => { const d = V3(ux, uy, uz).normalize(), p = forma(d.x, d.y, d.z), p2 = forma(d.x * 1.01, d.y * 1.01, d.z * 1.01); const n = p.clone().sub(forma(d.x * .97, d.y * .97, d.z * .97)).normalize(); p.addScaledVector(n, fora); return { p: p.applyMatrix4(torsoG.matrix), n: n.transformDirection(torsoG.matrix), p2 }; };

      // pescoço que desce da frente do tronco até a cabeça pendurada
      const baseP = naPele(0, .5, .86, -.12).p, pivo = V3(.04, 1.42, 1.66);
      const qPesc = tubo([baseP, V3(.02, baseP.y + .08, baseP.z + .32), V3(.05, 1.7, 1.52), V3(.05, 1.55, 1.64), pivo], t => .26 - .1 * t + .03 * Math.sin(t * 9), 20, 14);
      amassar(qPesc, .02, 6, 2);
      const pesc = new T.Mesh(guardar(qPesc), mPano); corpo.add(pesc);
      // ataduras no pescoço
      [[.35, .25], [.55, .21]].forEach(([tt, rr], k) => {
        const cv = new T.CatmullRomCurve3([baseP, V3(.02, baseP.y + .08, baseP.z + .32), V3(.05, 1.7, 1.52), V3(.05, 1.55, 1.64), pivo]);
        const p = cv.getPointAt(tt), d = cv.getTangentAt(tt);
        const a = new T.Mesh(guardar(new T.CylinderGeometry(rr, rr, .1, 18, 1, true)), mAtad); a.position.copy(p); a.quaternion.setFromUnitVectors(CIMA, d); a.rotateX(.25 * (k ? -1 : 1)); corpo.add(a);
      });

      /* ================= cabeça de boneco ================= */
      const cab = F.G(); cab.position.copy(pivo); corpo.add(cab);
      const cabI = F.G(); cabI.position.set(0, -.22, .14); cabI.rotation.set(.12, -.15, .38); cab.add(cabI);
      const RC = .35;
      const qCab = new T.SphereGeometry(RC, 40, 30); qCab.scale(1, .94, 1.04);
      { const pc = qCab.attributes.position; for (let i = 0; i < pc.count; i++) { const x = pc.getX(i), y = pc.getY(i), z = pc.getZ(i); const caido = y < 0 && x > 0 ? 1 + .18 * (-y / RC) * (x / RC) : 1; pc.setXYZ(i, x * caido, y - (x > 0 ? .03 * (x / RC) : 0), z); } qCab.computeVertexNormals(); }
      amassar(qCab, .022, 5, 7); // bochecha caída de um lado, cabeça torta
      cabI.add(new T.Mesh(guardar(qCab), mCab));
      const naCab = (x, y, z, fora = 0) => { const d = V3(x, y, z).normalize(); return { p: d.clone().multiplyScalar(RC * (1 + fora)).multiply(V3(1, .94, 1.04)), n: d }; };
      // costura vertical e horizontal da cabeça (pontos em cruz em relevo)
      const pontos = [];
      const pontoEm = (p, n, tang, L = .045) => { const b = V3().crossVectors(n, tang).normalize(); [1, -1].forEach(sg => { const q = new T.BoxGeometry(.008, .008, L); const dir = tang.clone().multiplyScalar(.6).addScaledVector(b, sg).normalize(); const m4 = new T.Matrix4().lookAt(V3(), dir, n).setPosition(p.clone().addScaledVector(n, .003)); q.applyMatrix4(m4); pontos.push([q, 0]); }); };
      for (let a = -1.25; a <= 1.3; a += .11) { const d = V3(Math.sin(a) * .02, Math.cos(a), Math.sin(a) + .15).normalize(); const { p, n } = naCab(d.x, d.y, d.z); const tg = V3(0, -Math.sin(a), Math.cos(a)).normalize(); pontoEm(p, n, tg); }
      for (let a = -2.4; a <= 2.4; a += .12) { const d = V3(Math.sin(a), -.08, Math.cos(a)); const { p, n } = naCab(d.x, d.y, d.z); pontoEm(p, n, V3(Math.cos(a), 0, -Math.sin(a))); }
      // boca costurada (pontos longos, tortos)
      for (let a = -.55; a <= .56; a += .1) { const d = V3(Math.sin(a), -.42 + Math.abs(a) * .12, Math.cos(a)); const { p, n } = naCab(d.x, d.y, d.z); pontoEm(p, n, V3(0, 1, 0).add(V3(Math.cos(a), 0, -Math.sin(a)).multiplyScalar(.15)), .08); }
      cabI.add(new T.Mesh(juntar(pontos), mLinha));
      // olho de botão (lado direito da criatura)
      { const { p, n } = naCab(-.36, .2, .9, .02); const b = F.G(); b.position.copy(p); b.quaternion.setFromUnitVectors(CIMA, n); cabI.add(b);
        const qb = new T.CylinderGeometry(.085, .09, .03, 24); b.add(new T.Mesh(guardar(qb), mBotao));
        const aro = new T.Mesh(guardar(new T.TorusGeometry(.075, .01, 6, 24)), mBotao); aro.rotation.x = Math.PI / 2; aro.position.y = .016; b.add(aro);
        [[-1, -1], [1, 1], [-1, 1], [1, -1]].forEach(([a2, b2]) => { const f = new T.Mesh(guardar(new T.CylinderGeometry(.011, .011, .01, 8)), mBuraco); f.position.set(a2 * .025, .014, b2 * .025); b.add(f); });
        [1, -1].forEach(sg => { const l = new T.Mesh(guardar(new T.BoxGeometry(.075, .01, .012)), mLinha); l.position.y = .02; l.rotation.y = sg * Math.PI / 4; b.add(l); });
      }
      // olho do outro lado: rasgo costurado em X, com um brilho vermelho lá dentro
      const olhoV = (() => { const { p, n } = naCab(.36, .18, .9, -.03); const b = F.G(); b.position.copy(p); b.quaternion.setFromUnitVectors(CIMA, n); cabI.add(b);
        const fenda = new T.Mesh(guardar(new T.SphereGeometry(.06, 16, 10)), mBuraco); fenda.scale.set(1.2, .35, .55); b.add(fenda);
        const o = new T.Mesh(guardar(new T.SphereGeometry(.03, 12, 8)), mOlho); o.position.set(.008, .016, 0); b.add(o);
        [1, -1].forEach(sg => { const l = new T.Mesh(guardar(new T.BoxGeometry(.15, .012, .014)), mLinha); l.position.y = .03; l.rotation.y = sg * .7; b.add(l); });
        return o; })();
      // linha solta pendurada da boca
      { const { p } = naCab(.22, -.4, .88, .01); const q = tubo([p, p.clone().add(V3(.02, -.1, .03)), p.clone().add(V3(-.02, -.22, .02)), p.clone().add(V3(.01, -.32, .04))], .005, 10, 4); cabI.add(new T.Mesh(guardar(q), mLinha)); }
      // rasgo largo onde seria a boca, costurado com linhas compridas que mal seguram
      { const { p, n } = naCab(.05, -.36, .93, -.01); const bo = F.G(); bo.position.copy(p); bo.quaternion.setFromUnitVectors(V3(0, 0, 1), n); bo.rotation.z += .12; cabI.add(bo);
        const gap = new T.Mesh(guardar(new T.SphereGeometry(.1, 20, 12)), mat({ color: '#030000', emissive: '#140000', emissiveIntensity: 1, roughness: .6 })); gap.scale.set(2.1, .5, .5); gap.position.z = -.012; bo.add(gap); // brasa vermelha lá dentro bo.add(gap);
        for (let i = -3; i <= 3; i++) { const l = new T.Mesh(guardar(new T.CylinderGeometry(.005, .005, .075, 4)), mLinha); l.position.set(i * .052, 0, .028); l.rotation.z = (R() - .5) * .5; bo.add(l); }
        for (let i = 0; i < 5; i++) { const d = new T.Mesh(guardar(new T.ConeGeometry(.012, .05, 5)), mat({ color: '#cfc4a8', roughness: .5 })); d.position.set(-.13 + i * .065 + (R() - .5) * .02, -.012, .025); d.rotation.x = Math.PI; bo.add(d); }
      }

      /* ================= tiras de pano pingando ================= */
      const tiras = [];
      const tira = (pai, p, n, larg, comp, col) => {
        const q = new T.PlaneGeometry(larg, comp, 1, 6); q.translate(0, -comp / 2, 0);
        const pa = q.attributes.position, uv = q.attributes.uv;
        for (let i = 0; i < pa.count; i++) { const y = -pa.getY(i) / comp; pa.setZ(i, .1 * y * y * comp + Math.sin(y * 5 + col) * .015); uv.setX(i, (col + .06 + uv.getX(i) * .88) / 8); }
        q.computeVertexNormals();
        const piv = F.G(); piv.position.copy(p); piv.rotation.y = Math.atan2(n.x, n.z); pai.add(piv);
        const me = new T.Mesh(guardar(q), mTira); piv.add(me); tiras.push({ piv, f: R() * 6, k: .6 + R() * .6 });
      };
      // embaixo e nos lados do tronco
      for (let i = 0; i < 46; i++) {
        const a = R() * 6.283, uy = -.15 - R() * .5, uz = (R() - .5) * 1.8;
        const { p, n } = naPele(Math.cos(a), uy, uz, -.03);
        tira(corpo, p, n, .1 + R() * .12, .35 + R() * .75, Math.floor(R() * 8));
      }
      // nos ombros e no pescoço (de cima, escorrendo pelo lado)
      for (let i = 0; i < 16; i++) { const sx = R() < .5 ? -1 : 1, { p, n } = naPele(sx * (.6 + R() * .3), .2 + R() * .3, .2 + R() * .6, -.03); tira(corpo, p, n, .1 + R() * .1, .4 + R() * .5, Math.floor(R() * 8)); }
      for (let i = 0; i < 7; i++) { const tt = .1 + R() * .45; const sx = i % 2 ? 1 : -1; const p = V3(.04 + sx * (.16 + R() * .05), 1.88 - tt * .3, 1.1 + tt * .45); tira(corpo, p, V3(sx, 0, .2), .08 + R() * .06, .25 + R() * .3, Math.floor(R() * 8)); }

      /* ================= núcleo roxo (no flanco, perto do ombro) ================= */
      const nucleo = (() => {
        const { p, n } = naPele(.92, .05, .5, -.02);
        const ng = F.G(); ng.position.copy(p); ng.quaternion.setFromUnitVectors(V3(0, 0, 1), n); corpo.add(ng);
        const mFer = mat({ color: '#17121a', roughness: .35, metalness: .75 });
        const mNuc = mat({ color: '#6a22d0', emissive: '#a040ff', emissiveIntensity: 2, roughness: .15 });
        const esf = new T.Mesh(guardar(new T.SphereGeometry(.075, 24, 18)), mNuc); esf.position.z = .03; ng.add(esf);
        const brilhoC = new T.Mesh(guardar(new T.SphereGeometry(.025, 10, 8)), mat({ color: '#ffffff', emissive: '#f0d0ff', emissiveIntensity: 3 })); brilhoC.position.set(.02, .02, .095); ng.add(brilhoC);
        const pecas = [[new T.TorusGeometry(.1, .018, 8, 28), 0]];
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * 6.283, c1 = Math.cos(a), s1 = Math.sin(a);
          pecas.push([tubo([V3(c1 * .1, s1 * .1, .01), V3(c1 * .17, s1 * .17, .05), V3(c1 * .25, s1 * .25, .0), V3(c1 * .3, s1 * .3, -.05)], t => .014 * (1 - t) + .002, 8, 5), 0]);
          const sp = new T.ConeGeometry(.012, .07, 5); sp.rotateX(Math.PI / 2); sp.translate(Math.cos(a + .39) * .13, Math.sin(a + .39) * .13, .04); pecas.push([sp, 0]);
        }
        pecas.push([tubo([V3(0, -.1, 0), V3(.02, -.25, -.02), V3(-.01, -.4, -.06)], t => .02 * (1 - t) + .004, 8, 5), 0]); // cicatriz escura escorrendo
        ng.add(new T.Mesh(juntar(pecas), mFer));
        const [c, x] = tela(128, 128), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(210,140,255,.9)'); gr.addColorStop(.3, 'rgba(150,60,255,.35)'); gr.addColorStop(1, 'rgba(90,0,200,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
        const halo = new T.Sprite(guardar(new T.SpriteMaterial({ map: F.texCanvas(c), blending: T.AdditiveBlending, depthWrite: false, transparent: true }))); halo.scale.set(.55, .55, 1); halo.position.z = .08; ng.add(halo);
        return { mNuc, halo };
      })();

      /* ================= membros (desiguais) ================= */
      // segmento: osso de torno com retalhos, ataduras e linhas soltas; devolve um grupo alinhado a +y
      const segmento = (L, perfil, mBase, ataduras, sem) => {
        const q = torno(L, perfil, 16, 14); amassar(q, .01, 7, sem);
        const lista = [[q, 0]];
        ataduras.forEach(([tt, inc]) => { const rr = perfil(tt) + .02; const a = new T.CylinderGeometry(rr, rr * 1.03, .09 + R() * .05, 18, 1, true); a.rotateX(inc); a.rotateZ(inc * .7); a.translate(0, tt * L, 0); lista.push([a, 1]); });
        const gr = F.G(); gr.add(new T.Mesh(juntar(lista), [mBase, mAtad])); return gr;
      };
      // pata pesada (pé de elefante com dedos)
      const pePesado = (mBase, botao) => {
        const gr = F.G();
        const q = torno(.24, t => .27 - .04 * t + .03 * Math.sin(t * 3), 18, 6); q.translate(0, -.03, 0); amassar(q, .015, 9, 3);
        const lista = [[q, 0]];
        for (let i = 0; i < 4; i++) { const a = -.75 + i * .5; const d = new T.SphereGeometry(.09, 12, 8); d.scale(1, .75, 1.2); d.translate(Math.sin(a) * .22, .04, Math.cos(a) * .22); lista.push([d, 0]); }
        gr.add(new T.Mesh(juntar(lista), mBase));
        for (let i = 0; i < 4; i++) { const a = -.75 + i * .5; const u = new T.Mesh(guardar(new T.SphereGeometry(.045, 8, 6)), mGarra); u.scale.set(1, .5, .7); u.position.set(Math.sin(a) * .3, .02, Math.cos(a) * .3); gr.add(u); }
        if (botao) { const b = new T.Mesh(guardar(new T.CylinderGeometry(.06, .06, .025, 18)), mBotao); b.position.set(.2, .13, .1); b.rotation.z = -1.3; gr.add(b); }
        return gr;
      };
      // mão de garras (palma e dedos compridos com unhas pretas)
      const maoGarra = (mBase) => {
        const gr = F.G(), dedos = [];
        const pal = new T.SphereGeometry(.1, 14, 10); pal.scale(1, .55, 1.2); amassar(pal, .01, 14, 5);
        gr.add(new T.Mesh(guardar(pal), mBase));
        for (let i = 0; i < 4; i++) {
          const a = -.6 + i * .4, dg = F.G(); dg.position.set(Math.sin(a) * .08, .02, Math.cos(a) * .1); dg.rotation.y = a; gr.add(dg);
          const q = tubo([V3(0, 0, 0), V3(0, .05, .1), V3(0, .02, .2), V3(0, -.06, .26)], t => .025 - .012 * t, 10, 6); dg.add(new T.Mesh(guardar(q), mBase));
          const u = new T.ConeGeometry(.013, .09, 6); u.rotateX(Math.PI * .8); u.translate(0, -.1, .28); dg.add(new T.Mesh(guardar(u), mGarra));
          dedos.push(dg);
        }
        const pol = F.G(); pol.position.set(-.1 * Math.sign(1), .0, .02); pol.rotation.y = -1.3; gr.add(pol);
        pol.add(new T.Mesh(guardar(tubo([V3(), V3(0, .02, .08), V3(0, -.04, .14)], t => .022 - .01 * t, 8, 6)), mBase));
        return { gr, dedos };
      };

      const membros = [];
      const novoMembro = o => {
        const sup = segmento(o.L1, o.p1, o.mat, o.at1, o.sem), inf = segmento(o.L2, o.p2, o.mat, o.at2, o.sem + 1);
        g.add(sup); g.add(inf);
        const joelho = new T.Mesh(guardar(amassar(new T.SphereGeometry(o.rj, 14, 10), .01, 10, o.sem)), o.mat); g.add(joelho);
        const ext = o.pesado ? pePesado(o.mat, o.botao) : maoGarra(o.mat); const pe = o.pesado ? ext : ext.gr; g.add(pe);
        const m = Object.assign({ sup, inf, joelho, pe, dedos: o.pesado ? [] : ext.dedos, K: V3(), alvo: o.repouso.clone(), H: V3() }, o);
        membros.push(m); return m;
      };
      // pata dianteira enorme e vermelha (lado esquerdo da criatura, +x)
      novoMembro({ nome: 'dE', pesado: true, ombro: V3(.5, 1.5, .78), repouso: V3(.8, .2, 1.02), L1: .95, L2: .9, polo: V3(.2, 0, 1), rj: .3,
        p1: t => .38 - .1 * t + .03 * Math.sin(t * 3.1), p2: t => .29 + .03 * Math.sin(t * 2.6 + .5) + .04 * t * t, at1: [[.7, .2]], at2: [[.35, .1], [.8, -.2]], sem: 3,
        mat: mPano, passo: .42, ergue: .12, duty: .74, fase: 0 });
      // pata traseira grossa e pálida (+x)
      novoMembro({ nome: 'tE', pesado: true, botao: true, ombro: V3(.52, 1.34, -.72), repouso: V3(.82, .2, -.5), L1: .95, L2: .82, polo: V3(.1, .2, 1), rj: .3,
        p1: t => .44 + .08 * Math.sin(t * 3) - .14 * t, p2: t => .28 - .02 * t + .02 * Math.sin(t * 5), at1: [[.2, .15]], at2: [[.5, .25]], sem: 5,
        mat: mPanoB, passo: .45, ergue: .14, duty: .72, fase: .68 });
      // braço dianteiro fino e enfaixado (-x)
      novoMembro({ nome: 'dD', pesado: false, ombro: V3(-.5, 1.52, .82), repouso: V3(-.85, .1, 1.45), L1: .95, L2: 1.02, polo: V3(-1, .7, -.1), rj: .13,
        p1: t => .13 - .04 * t + .015 * Math.sin(t * 6), p2: t => .095 - .035 * t, at1: [[.55, .2]], at2: [[.3, .1], [.62, -.15]], sem: 7,
        mat: mPano, passo: .6, ergue: .32, duty: .6, fase: .45 });
      // braço traseiro comprido (-x), cotovelo alto como pata de aranha
      novoMembro({ nome: 'tD', pesado: false, ombro: V3(-.46, 1.38, -.8), repouso: V3(-1.12, .1, -1.32), L1: 1.0, L2: 1.08, polo: V3(-1, .9, -.4), rj: .11,
        p1: t => .12 - .04 * t + .015 * Math.sin(t * 7), p2: t => .085 - .03 * t, at1: [[.5, .2]], at2: [[.3, -.2], [.6, .15]], sem: 9,
        mat: mPano, passo: .55, ergue: .3, duty: .62, fase: .2 });
      // tiras pingando dos braços e coxas (presas ao osso, caem pelo lado de fora)
      membros.forEach((m, k) => { const n = m.pesado ? 5 : 3; for (let i = 0; i < n; i++) { const tt = .25 + R() * .6, a = R() * 6.28, rr = m.p1(tt) * .95; const loc = V3(Math.cos(a) * rr, tt * m.L1, Math.sin(a) * rr); tira(g, loc.clone(), V3(Math.cos(a) * (k < 2 ? 1 : -1), 0, Math.sin(a)), .07 + R() * .07, .25 + R() * .35, Math.floor(R() * 8)); Object.assign(tiras[tiras.length - 1], { seg: m.sup, loc }); } });
      // linhas soltas penduradas nos membros finos
      membros.filter(m => !m.pesado).forEach((m, k) => { for (let i = 0; i < 3; i++) { const y = .2 + i * .25; const q = tubo([V3(.08, y, 0), V3(.1, y - .1, .02), V3(.09, y - .22, -.01)], .004, 6, 3); m.inf.add(new T.Mesh(guardar(q), mLinha)); } });

      // poça escura no chão
      const [cp, xp] = tela(256, 256); { const r = rng(5), gr = xp.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, 'rgba(25,4,4,.75)'); gr.addColorStop(.7, 'rgba(25,4,4,.35)'); gr.addColorStop(1, 'rgba(25,4,4,0)'); xp.fillStyle = gr; xp.fillRect(0, 0, 256, 256); for (let i = 0; i < 30; i++) { xp.fillStyle = `rgba(60,8,8,${r() * .4})`; xp.beginPath(); xp.arc(128 + (r() - .5) * 200, 128 + (r() - .5) * 200, 2 + r() * 8, 0, 7); xp.fill(); } }
      const poca = new T.Mesh(guardar(new T.PlaneGeometry(2.6, 3.4)), mat({ map: F.texCanvas(cp), transparent: true, depthWrite: false, roughness: .6 })); poca.rotation.x = -Math.PI / 2; poca.position.y = .006; g.add(poca);

      /* ================= animação ================= */
      let fase = 0, kAnda = 0;
      const tmp = V3(), tmp2 = V3();
      const anim = (dt, t, andando) => {
        kAnda += ((andando ? 1 : 0) - kAnda) * Math.min(1, dt * 3);
        fase += dt * (.5 + .1 * Math.sin(t * .7)) * kAnda;
        // passadas: cada membro com seu ritmo (manco e desigual)
        let pesoE = 0, pesoD = 0;
        membros.forEach(m => {
          const c = ((fase + m.fase) % 1 + 1) % 1; let dz = 0, dy = 0;
          if (c < m.duty) dz = m.passo * (.5 - c / m.duty);
          else { const u = (c - m.duty) / (1 - m.duty), e = u * u * (3 - 2 * u); dz = m.passo * (-.5 + e) + (m.pesado ? 0 : Math.sin(u * Math.PI) * .12); dy = m.ergue * Math.sin(u * Math.PI); }
          dz *= kAnda; dy *= kAnda;
          if (m.pesado) { if (m.nome === 'dE' || m.nome === 'tE') pesoE += dy / m.ergue; }
          else pesoD += dy / m.ergue;
          m.alvo.set(m.repouso.x, m.repouso.y + dy, m.repouso.z + dz);
        });
        // tronco: respiração irregular, guinadas para o lado que levanta a pata pesada
        const resp = Math.sin(t * 1.15 + .5 * Math.sin(t * .37)) + .4 * Math.sin(t * 2.9), soluco = tique(t, 5.3, .35);
        torso.scale.set(1 + resp * .02, 1 + resp * .025 + soluco * .04, 1);
        corpo.position.set(0, -.04 * pesoE * kAnda + Math.sin(t * 1.15) * .015 - soluco * .03, Math.sin(fase * 6.283 * 2) * .04 * kAnda);
        corpo.rotation.set(Math.sin(fase * 6.283) * .03 * kAnda, Math.sin(fase * 6.283) * .05 * kAnda, -.08 * pesoE * kAnda + .03 * pesoD * kAnda + Math.sin(t * .5) * .015);
        corpo.updateMatrix();
        // membros por IK (ombro preso ao corpo, mão/pé no alvo)
        membros.forEach(m => {
          m.H.copy(m.ombro).applyMatrix4(corpo.matrix);
          ik(m.H, m.alvo, m.L1, m.L2, m.polo, m.K);
          apontar(m.sup, m.H, m.K); m.joelho.position.copy(m.K);
          const d = tmp.copy(m.alvo).sub(m.K).normalize();
          apontar(m.inf, m.K, tmp2.copy(m.K).addScaledVector(d, 1));
          m.pe.position.copy(m.K).addScaledVector(d, m.L2);
          m.pe.position.y -= m.pesado ? .2 : .08;
          m.pe.rotation.set(m.pesado ? 0 : .15, m.pesado ? (m.nome === 'dE' ? .15 : .3) : (m.nome === 'dD' ? -.25 : -.6), 0);
          // dedos se mexendo em espasmos
          m.dedos.forEach((dg, i) => { dg.rotation.x = Math.sin(t * 5 + i * 1.7) * .08 + tique(t, 3.7 + i * .3, .4, i) * .45; });
        });
        // cabeça pendurada: balança como um peso e dá trancos de lado
        const tr = tique(t, 6.1, .5, 1.2), tr2 = tique(t, 9.7, .3, 4);
        cab.rotation.set(.12 + Math.sin(t * .9) * .07 + Math.sin(fase * 12.56) * .05 * kAnda - tr2 * .25, Math.sin(t * .43) * .25 + tr * .7, Math.sin(t * .7) * .08 + tr * .35);
        olhoV.scale.setScalar(.8 + .3 * Math.abs(Math.sin(t * 2.3)) + tr * .6);
        // tiras balançando (as dos membros acompanham o osso)
        tiras.forEach(ti => { if (ti.seg) { ti.seg.updateMatrix(); ti.piv.position.copy(ti.loc).applyMatrix4(ti.seg.matrix); } });
        tiras.forEach((ti, i) => { ti.piv.rotation.x = Math.sin(t * 1.4 * ti.k + ti.f) * .1 + Math.sin(fase * 12.56 + ti.f) * .12 * kAnda; ti.piv.rotation.z = Math.sin(t * 1.1 * ti.k + ti.f * 2) * .07; });
        // núcleo: pulso lento
        const pu = Math.pow(.5 + .5 * Math.sin(t * 1.3), 3);
        nucleo.mNuc.emissiveIntensity = 1.4 + pu * 2.2; nucleo.halo.material.opacity = .45 + pu * .55;
      };
      anim(0, 0, false);
      return { g, alt: 2.4, raioBase: .95, anim };
    },
  };
})();

/* ===== forma: texto_vivo ===== */
/* Forma de Filho: homem magro de texto impresso.
   A pele e os músculos expostos são feitos de linhas miúdas de letras sobre fibras de tendão; olhos e boca
   brilham em branco, a cabeça pende para trás, calça velha e pés descalços. O corpo "falha": o texto rasteja
   pela pele e, de tempos em tempos, a figura some por um instante e volta deslocada. */
(() => {
  const NS = window.ACF3D = window.ACF3D || {};

  // utilidades de modelagem (cada forma traz as suas, para o arquivo ser independente)
  function kit(F, sem) {
    const T = F.T, gd = F.guardar, R = F.rng(sem), V = (x, y, z) => new T.Vector3(x, y, z);
    const nz = (x, y, z) => Math.sin(x * 3.1 + Math.sin(y * 2.3 + z)) * Math.cos(y * 2.7 + Math.sin(z * 1.9 + x)) * .6 + Math.sin(z * 4.3 + x * 2.1 + y * 1.3) * .4;
    const malha = (geo, mat, pai, x = 0, y = 0, z = 0) => { const me = new T.Mesh(gd(geo), mat); me.position.set(x, y, z); if (pai) pai.add(me); return me; };
    // normais suaves mesmo na costura da UV (vértices na mesma posição somam as normais)
    function suavizar(geo) {
      geo.computeVertexNormals(); const p = geo.attributes.position, n = geo.attributes.normal, mapa = new Map();
      for (let i = 0; i < p.count; i++) { const k = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`; (mapa.get(k) || mapa.set(k, []).get(k)).push(i); }
      mapa.forEach(l => { if (l.length < 2) return; let x = 0, y = 0, z = 0; l.forEach(i => { x += n.getX(i); y += n.getY(i); z += n.getZ(i); }); const d = Math.hypot(x, y, z) || 1; l.forEach(i => n.setXYZ(i, x / d, y / d, z / d)); });
      return geo;
    }
    function deformar(geo, f, nor = true) { const p = geo.attributes.position, v = new T.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); f(v, i); p.setXYZ(i, v.x, v.y, v.z); } if (nor) suavizar(geo); return geo; }
    // tubo com raio variável ao longo de uma curva (membros, tendões, dedos)
    function tubo(pts, rf, ts = 20, rs = 8, f) {
      const cur = new T.CatmullRomCurve3(pts), geo = new T.TubeGeometry(cur, ts, 1, rs, false);
      const p = geo.attributes.position, c = new T.Vector3(), v = new T.Vector3(); let rm = 0;
      for (let i = 0; i <= ts; i++) { cur.getPointAt(i / ts, c); const r = typeof rf === 'function' ? rf(i / ts) : rf; rm += r;
        for (let j = 0; j <= rs; j++) { const k = i * (rs + 1) + j; v.fromBufferAttribute(p, k).sub(c); const a = j / rs * Math.PI * 2; v.multiplyScalar(r * (f ? 1 + f(i / ts, a) : 1)).add(c); p.setXYZ(k, v.x, v.y, v.z); } }
      const uv = geo.attributes.uv, kk = cur.getLength() / (2 * Math.PI * rm / (ts + 1)); for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * kk);
      if (f) suavizar(geo); return geo;
    }
    const mover = (geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => geo.applyMatrix4(new T.Matrix4().compose(V(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), V(sx, sy, sz)));
    // junta várias geometrias numa só (sem depender de BufferGeometryUtils)
    function juntar(geos) {
      const L = geos.map(g0 => g0.index ? g0.toNonIndexed() : g0); let n = 0; L.forEach(g0 => { n += g0.attributes.position.count; });
      const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0;
      L.forEach(g0 => { const a = g0.attributes; if (!a.normal) g0.computeVertexNormals(); P.set(a.position.array, o * 3); N.set(g0.attributes.normal.array, o * 3); if (a.uv) U.set(a.uv.array, o * 2); o += a.position.count; });
      geos.forEach(g0 => g0.dispose()); L.forEach(g0 => g0.dispose());
      const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(P, 3)); out.setAttribute('normal', new T.BufferAttribute(N, 3)); out.setAttribute('uv', new T.BufferAttribute(U, 2)); return out;
    }
    // núcleo roxo no peito: esfera brilhante numa moldura escura de patas de aranha, com halo
    function nucleo(pai, x, y, z, k = 1, rot = 0) {
      const n = new T.Group(); n.position.set(x, y, z); n.rotation.x = rot; pai.add(n);
      const luz = gd(new T.MeshStandardMaterial({ color: '#3a0a66', emissive: '#8a2be2', emissiveIntensity: 1.6, roughness: .2 }));
      malha(new T.SphereGeometry(.045 * k, 16, 12), luz, n, 0, 0, .012 * k);
      const ferro = gd(new T.MeshStandardMaterial({ color: '#141016', roughness: .45, metalness: .6 }));
      const pecas = [mover(new T.TorusGeometry(.058 * k, .011 * k, 6, 20), 0, 0, .01 * k)];
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .2, c = Math.cos(a), s = Math.sin(a);
        pecas.push(tubo([V(c * .055 * k, s * .055 * k, .01 * k), V(c * .09 * k, s * .09 * k, .03 * k), V(c * .13 * k, s * .13 * k, -.005 * k)], t => (.009 - t * .006) * k, 6, 5)); }
      malha(juntar(pecas), ferro, n);
      const [c, x2] = F.tela(64, 64), gr = x2.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(200,120,255,.9)'); gr.addColorStop(.35, 'rgba(150,60,255,.35)'); gr.addColorStop(1, 'rgba(120,40,255,0)'); x2.fillStyle = gr; x2.fillRect(0, 0, 64, 64);
      const halo = new T.Sprite(gd(new T.SpriteMaterial({ map: F.texCanvas(c), blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: .8 }))); halo.scale.setScalar(.32 * k); halo.position.z = .03 * k; n.add(halo);
      return { pulso: t => { const p = .5 + .5 * Math.sin(t * 1.3) * Math.sin(t * .37 + 1); luz.emissiveIntensity = 1.1 + p * .9; halo.material.opacity = .45 + p * .45; halo.scale.setScalar((.28 + p * .08) * k); } };
    }
    return { T, gd, R, V, nz, malha, suavizar, deformar, tubo, mover, juntar, nucleo };
  }

  (NS.formasFilho = NS.formasFilho || {}).texto_vivo = {
    nome: 'Texto vivo (homem de letras)',
    criar: (F, s) => {
      const K = kit(F, 1101), { T, gd, R, V, nz, malha, deformar, tubo, mover, juntar, nucleo } = K;
      const g = F.G(), corpo = F.G(); g.add(corpo);

      /* ---------- texturas ---------- */
      const CH = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,;:';
      const PAL = ['NINGUÉM', 'ESQUECIDO', 'QUEM', 'NOME', 'FIM', 'PÁGINA', 'NUNCA', 'EU'];
      const linha = (r, n) => { let t = ''; for (let i = 0; i < n; i++) t += r() < .17 ? ' ' : CH[r() * CH.length | 0]; return t; };
      // camada de letras (as mesmas para a cor e para o brilho)
      function letras(x, r, N, cor) {
        x.fillStyle = cor;
        for (let k = 0; k < 46; k++) {
          const cx = r() * N, cy = r() * N, rx = 18 + r() * 40, ry = 50 + r() * 120, an = (r() - .5) * 1.3, tam = 9 + (r() * 4 | 0);
          for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) {
            if (cx + dx + ry < 0 || cx + dx - ry > N || cy + dy + ry < 0 || cy + dy - ry > N) continue;
            x.save(); x.translate(cx + dx, cy + dy); x.rotate(an); x.beginPath(); x.ellipse(0, 0, rx, ry, 0, 0, 7); x.clip();
            x.rotate(r() < .5 ? Math.PI / 2 : 0); x.font = `${tam}px monospace`;
            const rr = F.rng(k * 13 + 7); for (let yy = -ry; yy < ry; yy += tam + 2) x.fillText(linha(rr, 30), -ry, yy);
            x.restore();
          }
        }
        x.font = 'bold 11px monospace'; for (let i = 0; i < 9; i++) { x.save(); x.translate(r() * N, r() * N); x.rotate((r() - .5) * 2); x.fillText(PAL[i % PAL.length], 0, 0); x.restore(); }
      }
      const N = 512;
      const [cP, xP] = F.tela(N, N); xP.fillStyle = '#463b22'; xP.fillRect(0, 0, N, N);
      { // feixes de músculo com fibras
        const r = F.rng(31);
        for (let k = 0; k < 60; k++) {
          const cx = r() * N, cy = r() * N, rx = 14 + r() * 34, ry = 40 + r() * 110, an = (r() - .5) * 1.1;
          for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) {
            if (cx + dx + ry < 0 || cx + dx - ry > N || cy + dy + ry < 0 || cy + dy - ry > N) continue;
            xP.save(); xP.translate(cx + dx, cy + dy); xP.rotate(an);
            const gr = xP.createRadialGradient(0, 0, 2, 0, 0, ry); gr.addColorStop(0, '#9a8758'); gr.addColorStop(.6, '#76653f'); gr.addColorStop(1, '#43381f');
            xP.fillStyle = gr; xP.beginPath(); xP.ellipse(0, 0, rx, ry, 0, 0, 7); xP.fill();
            xP.strokeStyle = 'rgba(40,30,15,.18)'; xP.lineWidth = 1; for (let f = -rx; f < rx; f += 5) { xP.beginPath(); xP.moveTo(f, -ry * .9); xP.quadraticCurveTo(f * 1.2, 0, f, ry * .9); xP.stroke(); }
            xP.strokeStyle = 'rgba(20,14,6,.7)'; xP.lineWidth = 2; xP.beginPath(); xP.ellipse(0, 0, rx, ry, 0, 0, 7); xP.stroke();
            xP.restore();
          }
        }
      }
      letras(xP, F.rng(57), N, 'rgba(246,236,205,.92)');
      // manchas de sujeira e veias escuras
      { const r = F.rng(77); for (let i = 0; i < 40; i++) { xP.fillStyle = `rgba(30,20,8,${.05 + r() * .12})`; xP.beginPath(); xP.arc(r() * N, r() * N, 10 + r() * 40, 0, 7); xP.fill(); }
        xP.strokeStyle = 'rgba(25,12,6,.5)'; for (let i = 0; i < 14; i++) { xP.lineWidth = 1 + r() * 1.5; xP.beginPath(); let px = r() * N, py = r() * N; xP.moveTo(px, py); for (let j = 0; j < 6; j++) { px += (r() - .5) * 50; py += 15 + r() * 25; xP.lineTo(px, py); } xP.stroke(); } }
      const [cE, xE] = F.tela(N, N); xE.fillStyle = '#000'; xE.fillRect(0, 0, N, N); letras(xE, F.rng(57), N, 'rgba(255,240,200,.85)');
      const texP = F.texCanvas(cP, [1, 1]), texE = F.texCanvas(cE, [1, 1]);
      const pele = gd(new T.MeshStandardMaterial({ map: texP, emissiveMap: texE, emissive: '#ffe2a8', emissiveIntensity: .45, roughness: .72, metalness: .02 }));
      // membros: feixes longos que correm ao longo do osso, com as linhas de texto seguindo a fibra
      function feixes(x, soLetras) {
        const r = F.rng(203), W = 512, H = 256;
        if (!soLetras) { x.fillStyle = '#3a301c'; x.fillRect(0, 0, W, H); }
        for (let b = 0; b < 11; b++) {
          const y0 = b * H / 11 + r() * 6, esp = 14 + r() * 10, k = 1 + (r() * 3 | 0), ph = r() * 6, amp = 2 + r() * 5, tam = 10 + (r() * 3 | 0);
          for (const dy of [-H, 0, H]) {
            x.save(); x.beginPath();
            for (let xx = 0; xx <= W; xx += 8) x.lineTo(xx, y0 + dy + Math.sin(xx / W * Math.PI * 2 * k + ph) * amp);
            for (let xx = W; xx >= 0; xx -= 8) x.lineTo(xx, y0 + dy + esp + Math.sin(xx / W * Math.PI * 2 * k + ph + .8) * amp * .6);
            x.closePath();
            if (!soLetras) { const gr = x.createLinearGradient(0, y0 + dy, 0, y0 + dy + esp); gr.addColorStop(0, '#5c4e30'); gr.addColorStop(.5, '#8f7d52'); gr.addColorStop(1, '#584a2c'); x.fillStyle = gr; x.fill(); x.strokeStyle = 'rgba(18,12,5,.45)'; x.lineWidth = 1.2; x.stroke(); }
            x.clip(); const rr = F.rng(300 + b);
            if (!soLetras) { x.strokeStyle = 'rgba(40,28,12,.12)'; x.lineWidth = 1; for (let f = 0; f < esp; f += 6) { x.beginPath(); for (let xx = 0; xx <= W; xx += 16) x.lineTo(xx, y0 + dy + f + Math.sin(xx / W * Math.PI * 2 * k + ph) * amp); x.stroke(); } }
            x.font = `${tam}px monospace`; x.fillStyle = soLetras ? 'rgba(255,240,200,.85)' : 'rgba(246,236,205,.9)';
            for (let yy = y0 + dy - amp; yy < y0 + dy + esp + amp; yy += tam + 1) x.fillText(linha(rr, 80), -rr() * 30, yy + tam);
            x.restore();
          }
        }
      }
      const [cL, xL] = F.tela(512, 256); feixes(xL, false);
      { const r = F.rng(71); for (let i = 0; i < 25; i++) { xL.fillStyle = `rgba(30,20,8,${.05 + r() * .12})`; xL.beginPath(); xL.ellipse(r() * 512, r() * 256, 20 + r() * 50, 8 + r() * 20, 0, 0, 7); xL.fill(); } }
      const [cLE, xLE] = F.tela(512, 256); xLE.fillStyle = '#000'; xLE.fillRect(0, 0, 512, 256); feixes(xLE, true);
      const peleM = gd(new T.MeshStandardMaterial({ map: F.texCanvas(cL, [1, 1]), emissiveMap: F.texCanvas(cLE, [1, 1]), emissive: '#ffe2a8', emissiveIntensity: .42, roughness: .72, metalness: .02 }));
      // calça velha: lona oliva desbotada, dobras, manchas
      const [cC, xC] = F.tela(256, 256); xC.fillStyle = '#4a4430'; xC.fillRect(0, 0, 256, 256);
      { const r = F.rng(91);
        for (let i = 0; i < 3000; i++) { xC.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '200,190,150'},${r() * .08})`; xC.fillRect(r() * 256, r() * 256, 1, 2); }
        for (let i = 0; i < 22; i++) { xC.fillStyle = `rgba(${r() < .5 ? '110,100,70' : '25,22,12'},${.12 + r() * .18})`; xC.beginPath(); xC.ellipse(r() * 256, r() * 256, 10 + r() * 40, 6 + r() * 25, r() * 3, 0, 7); xC.fill(); }
        for (let i = 0; i < 30; i++) { const x0 = r() * 256, y0 = r() * 256, h = 30 + r() * 90; const gr = xC.createLinearGradient(x0 - 6, 0, x0 + 6, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, `rgba(12,10,4,${.25 + r() * .3})`); gr.addColorStop(1, 'rgba(120,110,80,.12)'); xC.fillStyle = gr; xC.save(); xC.translate(x0, y0); xC.rotate((r() - .5) * .8); xC.fillRect(-6, -h / 2, 12, h); xC.restore(); }
        xC.strokeStyle = 'rgba(90,80,50,.6)'; xC.setLineDash([3, 3]); xC.lineWidth = 1; xC.beginPath(); xC.moveTo(0, 128); xC.lineTo(256, 128); xC.stroke(); xC.setLineDash([]); }
      const pano = gd(new T.MeshStandardMaterial({ map: F.texCanvas(cC, [1, 1]), roughness: .95 }));
      const couro = gd(new T.MeshStandardMaterial({ color: '#1d1610', roughness: .55, metalness: .1 }));
      const brilhoOlho = gd(new T.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff6dc', emissiveIntensity: 2.6, roughness: .3 }));
      const fundoBoca = gd(new T.MeshStandardMaterial({ color: '#140a05', emissive: '#ffe6b0', emissiveIntensity: .32, roughness: .5 }));
      const [cH, xH] = F.tela(64, 64); { const gr = xH.createRadialGradient(32, 32, 1, 32, 32, 32); gr.addColorStop(0, 'rgba(255,250,230,.95)'); gr.addColorStop(.3, 'rgba(255,240,200,.3)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); xH.fillStyle = gr; xH.fillRect(0, 0, 64, 64); }
      const halo = gd(new T.SpriteMaterial({ map: F.texCanvas(cH), blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
      const dente = gd(new T.MeshStandardMaterial({ color: '#d8ccaa', roughness: .4 }));
      const escuro = gd(new T.MeshStandardMaterial({ color: '#21170b', roughness: 1 }));
      // texto que rasteja: camada aditiva por cima da pele
      const [cR, xR] = F.tela(256, 256); xR.clearRect(0, 0, 256, 256);
      { const r = F.rng(123); for (let y = 6; y < 256; y += 7) { if (r() < .45) continue; xR.font = '6px monospace'; xR.fillStyle = `rgba(255,244,214,${.5 + r() * .5})`; xR.fillText(linha(r, 60), (r() - .5) * 40, y); } }
      const texR = F.texCanvas(cR, [2, 2]);
      const rasteja = gd(new T.MeshBasicMaterial({ map: texR, color: '#ffe8b8', transparent: true, opacity: .5, blending: T.AdditiveBlending, depthWrite: false }));
      const inchar = (geo, d) => { const c = geo.clone(), p = c.attributes.position, n = c.attributes.normal; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * d, p.getY(i) + n.getY(i) * d, p.getZ(i) + n.getZ(i) * d); return c; };

      /* ---------- pernas e calça ---------- */
      const quadril = 0.95, pernas = [];
      const bacia = new T.LatheGeometry([V(.0, -.14, 0), V(.118, -.14, 0), V(.142, -.08, 0), V(.152, -.01, 0), V(.14, .05, 0), V(.12, .085, 0), V(.0, .085, 0)].map(p => new T.Vector2(p.x, p.y)), 22, Math.PI);
      mover(bacia, 0, 0, 0, 0, 0, 0, 1, 1, .72); deformar(bacia, v => { v.x += nz(v.x * 9, v.y * 9, v.z * 9) * .006; });
      malha(bacia, pano, corpo, 0, quadril, 0);
      const cinto = malha(mover(new T.TorusGeometry(.124, .014, 6, 28), 0, 0, 0, Math.PI / 2, 0, 0, 1, 1, .74), couro, corpo, 0, quadril + .045, 0);
      cinto.rotation.z = .05;
      F.bx(corpo, .03, .026, .01, gd(new T.MeshStandardMaterial({ color: '#6b5a3a', metalness: .7, roughness: .4 })), .01, quadril + .032, .095);
      [-1, 1].forEach(sx => {
        const p = F.G(); p.position.set(sx * .085, quadril, 0); corpo.add(p);
        const dobra = (t, a) => .05 * Math.sin(a * 2 + t * 9) * (t > .55 ? 1.2 : .4) + .05 * Math.sin(t * 38 + a * 1.5) * Math.max(0, t - .5) + .02 * Math.sin(a * 5 + t * 13);
        p.rotation.x = sx < 0 ? -.14 : .1; p.rotation.z = sx * .04;
        malha(tubo([V(0, .02, 0), V(sx * .015, -.2, .04), V(sx * .028, -.43, .085), V(sx * .035, -.64, .045), V(sx * .045, -.86, -.01)], t => .092 - .02 * t + (t > .85 ? .012 : 0), 26, 12, dobra), pano, p);
        // pé descalço
        const pe = F.G(); pe.position.set(sx * .048, -.875, 0); p.add(pe);
        const peG = deformar(mover(new T.SphereGeometry(.05, 14, 10), 0, -.045, .05, 0, 0, 0, .85, .55, 2.3), v => { if (v.z < 0) v.y += .01; v.x += nz(v.x * 30, v.y * 30, v.z * 30) * .003; });
        const tornoz = tubo([V(0, .03, -.01), V(0, -.02, 0), V(0, -.05, .02)], .038, 6, 10);
        const ded = []; for (let i = 0; i < 5; i++) { const xx = (i - 2) * .017 * (sx > 0 ? -1 : 1), cmp = i === 2 * (sx > 0 ? 1 : 1) ? .03 : .025; ded.push(tubo([V(xx, -.07, .14 - Math.abs(i - 2) * .008), V(xx * 1.1, -.075, .16 + cmp - Math.abs(i - 2) * .008), V(xx * 1.15, -.088, .175 + cmp - Math.abs(i - 2) * .01)], t => .011 - t * .004 - (i ? 0 : -.003), 5, 6)); }
        malha(juntar([peG, tornoz, ...ded]), peleM, pe);
        pernas.push({ p, pe, sx });
      });

      /* ---------- tronco descarnado ---------- */
      const tronco = F.G(); tronco.position.set(0, quadril + .05, 0); tronco.rotation.set(-.04, .08, .07); corpo.add(tronco);
      const perfil = [[.0, -.04], [.104, -.04], [.106, .05], [.112, .14], [.132, .24], [.158, .33], [.17, .4], [.163, .45], [.135, .49], [.075, .53], [.03, .55], [.0, .555]];
      const trG = new T.LatheGeometry(perfil.map(([a, b]) => new T.Vector2(a, b)), 32, Math.PI);
      mover(trG, 0, 0, 0, 0, 0, 0, 1, 1, .6);
      deformar(trG, v => {
        const fr = v.z > 0 ? Math.min(1, v.z / .05) : 0, lado = Math.abs(v.x);
        // costelas aparentes
        if (v.y > .17 && v.y < .42) { const c = Math.max(0, Math.sin((v.y - .17 + lado * .35 * fr) * 2 * Math.PI / .042)); const k = .0075 * c * (1 - Math.max(0, (.02 - lado) / .02) * fr); const d = Math.hypot(v.x, v.z) || 1; v.x += v.x / d * k; v.z += v.z / d * k; }
        if (v.y > .0 && v.y < .17 && v.z > 0) v.z *= .82 + .06 * Math.sin(v.x * 70) * Math.sin(v.y * 60);
        if (lado < .016 && v.z > 0 && v.y > .2) v.z -= .006;
        if (lado < .02 && v.z < 0) v.z -= .006 * Math.max(0, Math.sin(v.y * 140));
        if (v.y > .38 && v.y < .5) { const cl = Math.exp(-Math.pow((v.y - .45) / .02, 2)) * .008; v.z += v.z > 0 ? cl : 0; }
        v.x += nz(v.x * 12, v.y * 12, v.z * 12) * .004;
      });
      { const uv = trG.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2.2, uv.getY(i) * 1.4); }
      malha(trG, pele, tronco);
      const casca = malha(inchar(trG, .004), rasteja, tronco);
      // clavículas e ombros ossudos
      const ossos = [];
      [-1, 1].forEach(sx => { ossos.push(tubo([V(sx * .015, .515, .05), V(sx * .1, .51, .055), V(sx * .175, .49, .01)], t => .012 + Math.sin(t * Math.PI) * .004, 10, 6)); ossos.push(deformar(mover(new T.SphereGeometry(.055, 12, 9), sx * .182, .455, -.005, 0, 0, sx * .3, .85, 1.05, .9), v => { v.y += nz(v.x * 20, v.y * 20, v.z * 20) * .004; })); });
      malha(juntar(ossos), pele, tronco);
      const fx = [];
      [-1, 1].forEach(sx => {
        for (let i = 0; i < 5; i++) { const y0 = .3 + i * .035; fx.push(tubo([V(sx * .012, y0, .094 - i * .002), V(sx * .08, y0 + .045 + i * .008, .1), V(sx * .165, .43, .045)], t => .011 + Math.sin(t * Math.PI) * .006, 12, 6)); }
        for (let i = 0; i < 4; i++) { const y0 = .1 + i * .05; fx.push(tubo([V(sx * .07, y0, .065), V(sx * .1, y0 + .06, .05), V(sx * .13, y0 + .14, .03)], .007, 8, 5)); }
      });
      malha(juntar(fx), peleM, tronco);
      const nuc = nucleo(tronco, -.012, .35, .098, .55, -.1);

      /* ---------- braços compridos demais ---------- */
      const bracos = [];
      [-1, 1].forEach(sx => {
        const b = F.G(); b.position.set(sx * .195, .45, -.01); b.rotation.set(-.14, 0, sx * (sx > 0 ? .1 : .2)); tronco.add(b);
        malha(tubo([V(0, .02, 0), V(sx * .015, -.16, .0), V(sx * .02, -.34, .02)], t => .043 - .012 * t + Math.sin(t * Math.PI) * .006, 16, 10, (t, a) => .05 * Math.sin(a * 3 + t * 20)), peleM, b);
        malha(juntar([tubo([V(-sx * .03, .04, .035), V(sx * .015, .02, .045), V(sx * .03, -.12, .03)], t => .016 * Math.sin(t * Math.PI) + .006, 10, 6), tubo([V(sx * .03, .02, -.03), V(sx * .04, -.05, -.02), V(sx * .03, -.14, -.01)], t => .014 * Math.sin(t * Math.PI) + .005, 10, 6), tubo([V(sx * .005, -.1, .035), V(sx * .015, -.2, .042), V(sx * .02, -.32, .03)], t => .012 * Math.sin(t * Math.PI) + .005, 10, 6)]), peleM, b);
        const cot = F.G(); cot.position.set(sx * .02, -.34, .02); cot.rotation.x = sx > 0 ? -.25 : -.45; b.add(cot);
        const anteG = tubo([V(0, 0, 0), V(sx * .006, -.17, .01), V(sx * .004, -.34, .0)], t => .033 - .01 * t + Math.sin(t * Math.PI) * .004, 16, 10, (t, a) => .06 * Math.sin(a * 2 + t * 14));
        malha(juntar([anteG, mover(new T.SphereGeometry(.03, 10, 8), 0, 0, -.01), tubo([V(sx * .02, -.02, .015), V(sx * .03, -.12, .02), V(sx * .012, -.3, .012)], t => .01 * Math.sin(t * Math.PI) + .004, 10, 5), tubo([V(-sx * .015, -.03, .02), V(-sx * .02, -.15, .025), V(-sx * .01, -.3, .01)], t => .009 * Math.sin(t * Math.PI) + .004, 10, 5)]), peleM, cot);
        if (sx > 0) malha(inchar(tubo([V(0, 0, 0), V(sx * .006, -.17, .01), V(sx * .004, -.34, .0)], .036, 12, 8), .0), rasteja, cot);
        // mão: palma e dedos longos meio curvados (cada dedo mexe sozinho)
        const mao = F.G(); mao.position.set(sx * .004, -.345, 0); mao.rotation.set(.1, sx * .2, 0); cot.add(mao);
        malha(deformar(mover(new T.SphereGeometry(.042, 12, 9), 0, -.045, 0, 0, 0, 0, .42, 1.1, .9), v => { v.x += nz(v.y * 40, v.z * 40, 1) * .002; }), pele, mao);
        const dedos = [];
        for (let i = 0; i < 5; i++) {
          const d = F.G(), pol = i === 4; d.position.set(pol ? -sx * .01 : 0, pol ? -.04 : -.085, pol ? .035 : -.026 + i * .018); d.rotation.set(pol ? .6 : 0, 0, pol ? 0 : -sx * .15); mao.add(d);
          const L = pol ? .075 : .12 + (i === 1 || i === 2 ? .03 : 0);
          malha(tubo([V(0, 0, 0), V(-sx * .006, -L * .45, .006), V(-sx * .03, -L * .82, .018), V(-sx * .05, -L * .9, .024)], t => .0095 - t * .005 + Math.max(0, Math.sin(t * Math.PI * 2.4)) * .0015, 10, 6), peleM, d);
          dedos.push(d);
        }
        bracos.push({ b, cot, mao, dedos, sx });
      });

      /* ---------- pescoço, cabeça jogada para trás, boca aberta ---------- */
      const pesc = F.G(); pesc.position.set(0, .52, -.015); pesc.rotation.x = -.28; tronco.add(pesc);
      malha(juntar([tubo([V(0, -.02, 0), V(0, .07, -.008), V(0, .14, -.02)], t => .04 - t * .006, 10, 10, (t, a) => .08 * Math.sin(a * 4)), ...[-1, 1].map(sx => tubo([V(sx * .03, .13, 0), V(sx * .022, .06, .02), V(sx * .012, -.0, .042)], .008, 8, 5))]), pele, pesc);
      const cab = F.G(); cab.position.set(0, .14, -.02); cab.rotation.set(-.62, .1, .1); pesc.add(cab);
      const cranio = deformar(mover(new T.SphereGeometry(.104, 30, 22, Math.PI), 0, .1, 0, 0, 0, 0, .84, 1.1, .98), v => {
        const y = v.y - .1;
        if (v.z > .03 && y > -.06 && y < .015) { const k = Math.min(1, (v.z - .03) / .04); v.z -= k * .03 * (1 - Math.abs(v.x) / .09); }
        if (v.z > .02 && y > .0 && y < .05 && Math.abs(v.x) > .02) v.z -= .008 * Math.exp(-Math.pow((Math.abs(v.x) - .04) / .02, 2)) * 3;
        if (y < -.04) { v.x *= 1 - (-.04 - y) * 2; }
        if (Math.abs(v.x) > .05 && y > -.05 && y < .03 && v.z > 0) v.x *= .92;
        for (const ox of [-.036, .036]) { const d = Math.hypot(v.x - ox, y - .018); if (v.z > .03 && d < .034) v.z -= .022 * (1 - d / .034); }
        v.y += nz(v.x * 25, v.y * 25, v.z * 25) * .003;
      });
      { const uv = cranio.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.6, uv.getY(i) * .9); }
      malha(cranio, pele, cab);
      malha(inchar(cranio, .003), rasteja, cab);
      [-1, 1].forEach(sx => {
        malha(mover(new T.SphereGeometry(.024, 12, 9), 0, 0, 0, 0, 0, 0, 1.1, 1, .6), escuro, cab, sx * .036, .118, .054);
        const o = malha(new T.SphereGeometry(.0165, 14, 10), brilhoOlho, cab, sx * .036, .116, .064); o.scale.set(1, .9, .85);
        const h = new T.Sprite(halo); h.scale.setScalar(.075); h.position.set(sx * .036, .116, .08); cab.add(h);
        malha(new T.SphereGeometry(.0045, 6, 5), escuro, cab, sx * .009, .084, .084);
        malha(mover(new T.SphereGeometry(.024, 8, 6), 0, 0, 0, 0, 0, 0, .35, 1, .7), pele, cab, sx * .088, .1, -.005);
      });
      // boca escancarada: fundo brilhante, dentes, mandíbula caída
      malha(mover(new T.SphereGeometry(.042, 14, 10), 0, 0, 0, 0, 0, 0, 1, 1.15, .55), fundoBoca, cab, 0, .055, .06);
      const dentes = []; for (let i = 0; i < 13; i++) { if (R() < .15) continue; const a = (i - 6) / 6 * 1; dentes.push(mover(new T.CylinderGeometry(.0028, .002, .009 + R() * .008, 5), Math.sin(a) * .034, .07 - R() * .003, .058 + Math.cos(a) * .028, (R() - .5) * .3, a, (R() - .5) * .4)); }
      malha(juntar(dentes), dente, cab);
      const mand = F.G(); mand.position.set(0, .06, .0); mand.rotation.x = .38; cab.add(mand);
      const mandG = deformar(mover(new T.SphereGeometry(.07, 18, 10, 0, Math.PI * 2, Math.PI * .5, Math.PI * .5), 0, 0, .02, 0, 0, 0, .9, .75, 1.05), v => { if (v.z > .04) v.y -= .01; });
      const dIn = []; for (let i = 0; i < 11; i++) { if (R() < .2) continue; const a = (i - 5) / 5 * .95; dIn.push(mover(new T.CylinderGeometry(.002, .0028, .008 + R() * .008, 5), Math.sin(a) * .03, .004, .03 + Math.cos(a) * .026, (R() - .5) * .3, a, (R() - .5) * .5)); }
      malha(mandG, pele, mand); malha(juntar(dIn), dente, mand);

      // tiras de pele-papel descolando, balançam e tremem nas falhas
      const tiras = [];
      [[tronco, .12, .44, -.06, .4], [tronco, -.15, .42, -.05, -.6], [tronco, .05, .3, -.1, 2.9], [tronco, -.09, .18, .09, .2], [tronco, .14, .2, .05, 1.2], [pesc, .03, .08, -.03, 2.6]].forEach(([pai, x, y, z, ry], i) => {
        const piv = F.G(); piv.position.set(x, y, z); piv.rotation.y = ry; pai.add(piv);
        const geo = deformar(new T.PlaneGeometry(.025 + R() * .015, .07 + R() * .05, 3, 8), v => { const q = Math.max(0, -v.y + .03); v.z += q * q * 9; v.x += Math.sin(v.y * 40) * .004; v.y -= .045; }, false); geo.computeVertexNormals();
        const fol = new T.Mesh(gd(geo), gd(new T.MeshStandardMaterial({ map: texP, emissiveMap: texE, emissive: '#ffe2a8', emissiveIntensity: .3, roughness: .8, side: T.DoubleSide }))); fol.rotation.x = -.3 - R() * .4; piv.add(fol); tiras.push(fol);
      });

      /* ---------- animação ---------- */
      const mats = [halo, pele, peleM, pano, couro, brilhoOlho, fundoBoca, dente, escuro, ...tiras.map(f => f.material)];
      let fase = 0, prox = 1.2 + R() * 2, falha = 0, tique = 0, alvoCab = 0, cabY = .1;
      corpo.scale.setScalar(1.04);
      const anim = (dt, t, andando) => {
        nuc.pulso(t);
        // respiração irregular e tremida
        const resp = Math.sin(t * 1.4) * .6 + Math.sin(t * 3.7) * .25 + (Math.sin(t * .31) > .8 ? Math.sin(t * 19) * .3 : 0);
        tronco.scale.set(1 + resp * .018, 1, 1 + resp * .03);
        mand.rotation.x = .36 + Math.sin(t * .9) * .05 + resp * .03;
        // cabeça: pende para trás e dá trancos de lado
        tique -= dt; if (tique <= 0) { tique = .6 + R() * 2.4; alvoCab = (R() - .5) * 1.1; }
        cabY += (alvoCab - cabY) * Math.min(1, dt * (R() < .1 ? 25 : 4));
        cab.rotation.y = cabY; cab.rotation.z = .1 + Math.sin(t * .7) * .12;
        cab.rotation.x = -.62 + Math.sin(t * .5) * .08;
        // dedos inquietos
        bracos.forEach((B, j) => B.dedos.forEach((d, i) => { d.rotation.x = Math.sin(t * (2.1 + i * .7) + j * 3) * .18 + (Math.sin(t * 11 + i) > .93 ? .4 : 0); }));
        if (andando) {
          // anda arrastando: passos curtos, tronco balançando, um pé que se arrasta
          fase += dt * 4.2; const a = Math.sin(fase);
          pernas[0].p.rotation.x = -.05 + a * .38; pernas[1].p.rotation.x = .05 - a * .22;
          pernas[1].pe.rotation.x = .25 + a * .1;
          corpo.rotation.z = Math.sin(fase) * .07; corpo.position.y = Math.abs(Math.cos(fase)) * .025;
          tronco.rotation.x = .06 + Math.sin(fase * 2) * .04;
          bracos.forEach((B, i) => { B.b.rotation.x = -.14 + (i ? -1 : 1) * a * .3; B.cot.rotation.x = (B.sx > 0 ? -.25 : -.45) + Math.sin(fase * 2 + i) * .15; });
        } else {
          pernas.forEach(P => { P.p.rotation.x += ((P.sx < 0 ? -.14 : .1) - P.p.rotation.x) * .1; P.pe.rotation.x *= .9; });
          corpo.rotation.z = Math.sin(t * .45) * .03; corpo.position.y *= .9;
          tronco.rotation.x = -.04 + Math.sin(t * .6) * .02;
          bracos.forEach((B, i) => { B.b.rotation.x = -.14 + Math.sin(t * .8 + i * 2) * .06; });
        }
        tiras.forEach((f, i) => { f.rotation.x = -.45 + Math.sin(t * 1.7 + i * 2) * .15 + (falha > 0 ? (R() - .5) * .8 : 0); });
        // o texto rasteja pela pele
        texR.offset.y += dt * .35; texR.offset.x = Math.sin(t * .4) * .1;
        // falha: some por um instante, volta deslocado
        prox -= dt;
        if (prox <= 0 && falha <= 0) { falha = .12 + R() * .3; prox = 1.4 + R() * 3.2; mats.forEach(m0 => { if (m0 !== halo) m0.transparent = true; }); }
        if (falha > 0) {
          falha -= dt; const op = R() < .35 ? .05 : .25 + R() * .5;
          mats.forEach(m0 => { m0.opacity = op; }); rasteja.opacity = 1;
          corpo.position.x = (R() - .5) * .08; cab.position.x = (R() - .5) * .05; tronco.position.x = (R() - .5) * .03;
          texR.offset.y += R() * .5;
          if (falha <= 0) { mats.forEach(m0 => { m0.opacity = 1; if (m0 !== halo) m0.transparent = false; }); corpo.position.x = 0; cab.position.x = 0; tronco.position.x = 0; }
        } else rasteja.opacity = .35 + Math.max(0, Math.sin(t * 2.3)) * .3;
      };
      return { g, alt: 1.9, raioBase: .38, anim };
    },
  };
})();

/* ===== forma: tita_algemado ===== */
(() => {
  const NS = window.ACF3D = window.ACF3D || {};
  /* ===== kit de modelagem orgânica (igual em todas as formas, para cada arquivo funcionar sozinho) ===== */
  function kit(F, s) {
    const T = F.T;
    const L = c => new T.Color(c).convertSRGBToLinear();
    // semente a partir do id do ser: vários iguais na mesma sala saem diferentes
    let h = 2166136261; String((s && s.id) || 'x').split('').forEach(ch => { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); });
    const semente = (h >>> 0) % 99991;
    const rngDe = n => { let a = (n * 2654435761) >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
    const rng = rngDe(semente + 7);
    const tela = (w, hh) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; return [c, c.getContext('2d')]; };
    // material PBR guardado (cores escritas como aparecem na tela)
    const mat = (o = {}) => {
      const p = { color: L(o.cor || '#ffffff'), roughness: o.r ?? .7, metalness: o.me ?? 0 };
      if (o.e) { p.emissive = L(o.e); p.emissiveIntensity = o.ei ?? 1; }
      if (o.mapa) p.map = o.mapa; if (o.bump) { p.bumpMap = o.bump; p.bumpScale = o.bs ?? 1; }
      if (o.rMapa) p.roughnessMap = o.rMapa; if (o.emiMapa) p.emissiveMap = o.emiMapa;
      if (o.vc) p.vertexColors = true; if (o.lado) p.side = T.DoubleSide;
      if (o.alfa) p.alphaTest = o.alfa;
      if (o.op !== undefined) { p.transparent = true; p.opacity = o.op; p.depthWrite = false; }
      const m = F.guardar(new T.MeshStandardMaterial(p));
      if (o.flat) m.flatShading = true;
      return m;
    };
    const tex = (c, rep) => F.texCanvas(c, rep || [1, 1]);
    // ruído de valor 3D e fbm (0 a ~0,9)
    const hs = (x, y, z) => { const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + semente * .0131) * 43758.5453; return v - Math.floor(v); };
    const hf = (x, y, z) => { const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return v - Math.floor(v); };
    const sm = t => t * t * (3 - 2 * t);
    const lerp = (a, b, t) => a + (b - a) * t;
    function ruido(x, y, z) {
      const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = sm(x - ix), fy = sm(y - iy), fz = sm(z - iz);
      const a = (i, j, k) => hs(ix + i, iy + j, iz + k);
      return lerp(lerp(lerp(a(0, 0, 0), a(1, 0, 0), fx), lerp(a(0, 1, 0), a(1, 1, 0), fx), fy), lerp(lerp(a(0, 0, 1), a(1, 0, 1), fx), lerp(a(0, 1, 1), a(1, 1, 1), fx), fy), fz);
    }
    const fbm = (x, y, z, n = 3) => { let r = 0, a = .5, f = 1; for (let i = 0; i < n; i++) { r += a * ruido(x * f + i * 17, y * f, z * f); a *= .5; f *= 2.03; } return r; };
    // células (placas): distância à 1ª e à 2ª semente e um id por placa
    function celula(x, y, z) {
      const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z); let f1 = 9, f2 = 9, id = 0;
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
        const cx = ix + i, cy = iy + j, cz = iz + k;
        const dx = cx + hf(cx, cy, cz) - x, dy = cy + hf(cy + 3.1, cz, cx) - y, dz = cz + hf(cz - 7.7, cx, cy) - z, d = dx * dx + dy * dy + dz * dz;
        if (d < f1) { f2 = f1; f1 = d; id = hf(cx * 1.7, cy * 2.3, cz * 3.1); } else if (d < f2) f2 = d;
      }
      return [Math.sqrt(f1), Math.sqrt(f2), id];
    }
    // normais suaves sem costura (vértices na mesma posição dividem a normal)
    function suavizar(geo) {
      geo.computeVertexNormals();
      const p = geo.attributes.position, n = geo.attributes.normal, mapa = new Map();
      for (let i = 0; i < p.count; i++) { const k = p.getX(i).toFixed(4) + ',' + p.getY(i).toFixed(4) + ',' + p.getZ(i).toFixed(4); let a = mapa.get(k); if (!a) { a = []; mapa.set(k, a); } a.push(i); }
      mapa.forEach(a => { if (a.length < 2) return; let x = 0, y = 0, z = 0; a.forEach(i => { x += n.getX(i); y += n.getY(i); z += n.getZ(i); }); const l = Math.hypot(x, y, z) || 1; a.forEach(i => n.setXYZ(i, x / l, y / l, z / l)); });
      return geo;
    }
    // cor por vértice (função da posição) para poder juntar e sombrear regiões
    function pintar(geo, fn) {
      const p = geo.attributes.position, c = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const v = typeof fn === 'function' ? fn(p.getX(i), p.getY(i), p.getZ(i)) : fn; c[i * 3] = v[0]; c[i * 3 + 1] = v[1]; c[i * 3 + 2] = v[2]; }
      geo.setAttribute('color', new T.BufferAttribute(c, 3)); return geo;
    }
    const BRANCO = [1, 1, 1];
    // junta várias geometrias indexadas em uma (menos chamadas de desenho)
    function juntar(geos) {
      geos = geos.filter(Boolean).map(g => { if (!g.index) { const n = g.attributes.position.count, ix = []; for (let i = 0; i < n; i++) ix.push(i); g.setIndex(ix); } if (!g.attributes.color) pintar(g, BRANCO); if (!g.attributes.uv) g.setAttribute('uv', new T.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); if (!g.attributes.normal) g.computeVertexNormals(); return g; });
      let nv = 0, ni = 0; geos.forEach(g => { nv += g.attributes.position.count; ni += g.index.count; });
      const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), C = new Float32Array(nv * 3), I = new (nv > 65535 ? Uint32Array : Uint16Array)(ni);
      let ov = 0, oi = 0;
      geos.forEach(g => { const c = g.attributes.position.count; P.set(g.attributes.position.array, ov * 3); N.set(g.attributes.normal.array, ov * 3); U.set(g.attributes.uv.array, ov * 2); C.set(g.attributes.color.array, ov * 3); const ix = g.index.array; for (let i = 0; i < ix.length; i++) I[oi + i] = ix[i] + ov; ov += c; oi += ix.length; g.dispose(); });
      const r = new T.BufferGeometry(); r.setAttribute('position', new T.BufferAttribute(P, 3)); r.setAttribute('normal', new T.BufferAttribute(N, 3)); r.setAttribute('uv', new T.BufferAttribute(U, 2)); r.setAttribute('color', new T.BufferAttribute(C, 3)); r.setIndex(new T.BufferAttribute(I, 1));
      return r;
    }
    // aplica posição/rotação/escala numa geometria (para juntar peças já no lugar)
    const _o = new T.Object3D();
    function por(geo, pos = [0, 0, 0], rot = [0, 0, 0], esc = [1, 1, 1]) { _o.position.set(...pos); _o.rotation.set(...rot); _o.scale.set(...(Array.isArray(esc) ? esc : [esc, esc, esc])); _o.updateMatrix(); geo.applyMatrix4(_o.matrix); return geo; }
    function malha(pai, geo, m, pos, rot) { const me = new T.Mesh(F.guardar(geo), m); if (pos) me.position.set(...pos); if (rot) me.rotation.set(...rot); pai.add(me); return me; }
    function junta(pai, x = 0, y = 0, z = 0) { const j = new T.Group(); j.position.set(x, y, z); pai.add(j); return j; }

    /* tubo orgânico que passa pelos pontos pts ([x,y,z]); raios: números ou [largura, profundidade] ao longo.
       o: { nr, nl, ref, ruido, fq, deform(q, dir, t, a) → deslocamento, cor(q, t, a) → [r,g,b] ou cor fixa,
       ini, fim (pontas arredondadas: fração do raio; negativo = sem tampa), uvV (repetição ao longo) } */
    function tubo(pts, raios, o = {}) {
      const nr = o.nr || 10, nl = o.nl || Math.max(6, pts.length * 4);
      const V = pts.map(p => new T.Vector3(p[0], p[1], p[2]));
      const curva = V.length === 2 ? new T.LineCurve3(V[0], V[1]) : new T.CatmullRomCurve3(V, false, 'centripetal');
      const ref = new T.Vector3(...(o.ref || [0, 0, 1]));
      const RR = raios.map(r => Array.isArray(r) ? r : [r, r]);
      const R = t => { if (RR.length === 1) return RR[0]; const k = t * (RR.length - 1), i = Math.min(RR.length - 2, Math.floor(k)), f = sm(k - i); return [lerp(RR[i][0], RR[i + 1][0], f), lerp(RR[i][1], RR[i + 1][1], f)]; };
      const pos = [], uv = [], idx = [], col = [];
      const P = new T.Vector3(), Tg = new T.Vector3(), Lx = new T.Vector3(), Lz = new T.Vector3(), q = new T.Vector3(), dir = new T.Vector3();
      const fq = o.fq || 9, aneis = [];
      const corF = !o.cor ? null : typeof o.cor === 'function' ? o.cor : () => o.cor;
      for (let i = 0; i <= nl; i++) {
        const t = i / nl; curva.getPointAt(t, P); curva.getTangentAt(t, Tg);
        Lx.crossVectors(Tg, ref); if (Lx.lengthSq() < 1e-8) Lx.set(1, 0, 0); Lx.normalize(); Lz.crossVectors(Lx, Tg).normalize();
        const [rx, rz] = R(t); aneis.push([P.clone(), Tg.clone(), Math.max(rx, rz)]);
        for (let j = 0; j <= nr; j++) {
          const a = (j / nr - .5) * Math.PI * 2, sa = Math.sin(a), ca = Math.cos(a);
          q.copy(P).addScaledVector(Lx, sa * rx).addScaledVector(Lz, ca * rz);
          dir.copy(Lx).multiplyScalar(sa * rz).addScaledVector(Lz, ca * rx).normalize();
          let d = 0;
          if (o.ruido) d += (fbm(q.x * fq + 3, q.y * fq, q.z * fq) - .44) * o.ruido;
          if (o.deform) d += o.deform(q, dir, t, a) || 0;
          q.addScaledVector(dir, d);
          pos.push(q.x, q.y, q.z); uv.push(j / nr, t * (o.uvV || 1));
          const c = corF ? corF(q, t, a) : BRANCO; col.push(c[0], c[1], c[2]);
        }
      }
      const W = nr + 1;
      for (let i = 0; i < nl; i++) for (let j = 0; j < nr; j++) { const a = i * W + j, b = a + W; idx.push(a, a + 1, b, b, a + 1, b + 1); }
      // tampas arredondadas (polo empurrado para fora)
      const tampa = (anel, k, sinal) => {
        if (k < 0) return; const [Pc, Tc, r] = aneis[anel]; const pp = Pc.clone().addScaledVector(Tc, sinal * r * k);
        const c = corF ? corF(pp, anel ? 1 : 0, 0) : BRANCO; const iv = pos.length / 3; pos.push(pp.x, pp.y, pp.z); uv.push(.5, anel ? (o.uvV || 1) : 0); col.push(c[0], c[1], c[2]);
        for (let j = 0; j < nr; j++) { const a = anel * W + j; if (sinal > 0) idx.push(a, a + 1, iv); else idx.push(a + 1, a, iv); }
      };
      tampa(0, o.ini ?? .5, -1); tampa(nl, o.fim ?? .5, 1);
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx);
      return suavizar(g);
    }
    // elipsoide deformado: def(x,y,z na esfera unitária) → [x,y,z]; ruído opcional
    function bolha(rx, ry, rz, o = {}) {
      const g = new T.SphereGeometry(1, o.ws || 20, o.hs || 14), p = g.attributes.position, fq = o.fq || 3;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        if (o.def) [x, y, z] = o.def(x, y, z);
        let k = 1; if (o.ruido) k += (fbm(x * fq + 5, y * fq, z * fq) - .44) * o.ruido;
        p.setXYZ(i, x * rx * k, y * ry * k, z * rz * k);
      }
      if (o.cor) pintar(g, typeof o.cor === 'function' ? (x, y, z) => o.cor({ x, y, z }) : o.cor); return suavizar(g);
    }
    // cones (dentes, garras, espinhos) juntos: lista de [pos, dir, comp, raio]
    function espinhos(lista, o = {}) {
      const geos = lista.map(([p, d, comp, r]) => { const g = new T.ConeGeometry(r, comp, o.lados || 5, 1); g.translate(0, comp / 2, 0); const v = new T.Vector3(...d).normalize(); g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), v)); g.translate(...p); pintar(g, o.c || BRANCO); return g; });
      return juntar(geos);
    }
    /* núcleo roxo no peito: esfera brilhante numa moldura escura de espinhos (como aranha) */
    function nucleo(pai, r, pos, rot, o = {}) {
      const g = junta(pai, ...pos); if (rot) g.rotation.set(...rot);
      const mN = mat({ cor: '#2a0844', e: '#8f2bff', ei: 1.4, r: .15, me: .1 });
      const esf = malha(g, new T.SphereGeometry(r, 20, 14), mN, [0, 0, r * .25]);
      const brilho = F.guardar(new T.MeshBasicMaterial({ color: L('#7a20ff'), transparent: true, opacity: .28, blending: T.AdditiveBlending, depthWrite: false }));
      const halo = malha(g, new T.SphereGeometry(r * 1.9, 16, 12), brilho, [0, 0, r * .4]);
      const mM = mat({ cor: '#140a10', r: .35, me: .45 });
      const pecas = [por(new T.TorusGeometry(r * 1.18, r * .2, 6, 24), [0, 0, r * .1])];
      const n = o.pernas || 8;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + .2, ca = Math.cos(a), sa = Math.sin(a), R1 = r * 1.2, R2 = r * (2.1 + (i % 2) * .5), R3 = r * (2.9 + (i % 3) * .4);
        pecas.push(tubo([[ca * R1, sa * R1, r * .15], [ca * R2, sa * R2, r * .55], [ca * R3, sa * R3, -r * .1]], [r * .13, r * .1, r * .02], { nr: 5, nl: 6, fim: 1.5 }));
      }
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; pecas.push(por(new T.ConeGeometry(r * .1, r * .55, 4), [Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3, r * .35], [0, 0, a - Math.PI / 2])); }
      malha(g, juntar(pecas), mM);
      const pulso = (t, extra = 0) => { const k = .5 + .5 * Math.sin(t * 1.3) * Math.sin(t * .37 + 1); mN.emissiveIntensity = .9 + k * 1.3 + extra; brilho.opacity = .1 + k * .2; halo.scale.setScalar(.85 + k * .35); };
      return { g, pulso, mat: mN };
    }
    return { T, L, mat, tex, tela, rng, rngDe, semente, ruido, fbm, celula, hs, hf, sm, lerp, suavizar, pintar, juntar, por, malha, junta, tubo, bolha, espinhos, nucleo };
  }
  /* Titã curvado de carne vermelha em placas rachadas, com algemas de ferro enferrujado e correntes partidas
     nos pulsos. Uns 3,4 m: ombros acima da cabeça, mãos enormes quase no chão, passos pesados que tremem o chão. */
  (NS.formasFilho = NS.formasFilho || {}).tita_algemado = {
    nome: 'Titã algemado (placas de carne)',
    criar: (F, s) => {
      const K = kit(F, s), { T, L, mat, tubo, bolha, malha, junta, juntar, por, pintar, fbm, celula, sm } = K;
      const g = new T.Group();

      /* ---------- carne em placas: deslocamento por células 3D (rachaduras fundas) e cor por placa ---------- */
      const PAL = ['#8e3426', '#6a1e14', '#a4442f', '#561510', '#b85a44', '#7a281c', '#c87058'].map(c => L(c));
      const FENDA = L('#120202'), BORDA = L('#3e0c08');
      let ult = [1, 1, 0];
      const placas = (fq = 5.5, prof = .028, bojo = .02, esc = 1) => ({
        deform: (q) => { const c = celula(q.x * fq + 11, q.y * fq + 3, q.z * fq + 7); ult = c; const e = c[1] - c[0]; return -prof * 1.4 * (1 - sm(Math.min(1, e / .12))) + bojo * (.5 - c[0]) + (c[2] - .5) * bojo * .8; },
        cor: () => { const [f1, f2, id] = ult, e = f2 - f1, base = PAL[Math.floor(id * PAL.length) % PAL.length], v = esc * (.8 + fbm(id * 9, f1 * 3, 0) * .3) * (1.25 - f1 * .55); let r = base.r * v, gg = base.g * v, b = base.b * v; const k1 = 1 - sm(Math.min(1, e / .07)), k2 = (1 - sm(Math.min(1, e / .2))) * (1 - k1); r = r * (1 - k2 * .55) + BORDA.r * k2 * .55; gg = gg * (1 - k2 * .55) + BORDA.g * k2 * .55; b = b * (1 - k2 * .55) + BORDA.b * k2 * .55; return [r * (1 - k1) + FENDA.r * k1, gg * (1 - k1) + FENDA.g * k1, b * (1 - k1) + FENDA.b * k1]; },
      });
      // textura de detalhe (multiplica a cor das placas): poros, fissuras finas e manchas
      const [c, x] = K.tela(512, 512), [cb, xb] = K.tela(256, 256), r2 = K.rngDe(404);
      x.fillStyle = '#d0a89c'; x.fillRect(0, 0, 512, 512); xb.fillStyle = '#909090'; xb.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 60; i++) { const gx = r2() * 512, gy = r2() * 512, rr = 20 + r2() * 60, gr = x.createRadialGradient(gx, gy, 0, gx, gy, rr); gr.addColorStop(0, r2() < .5 ? 'rgba(255,225,210,.35)' : 'rgba(120,40,30,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(gx - rr, gy - rr, rr * 2, rr * 2); }
      const fissura = (x0, y0, n, wd) => { let px = x0, py = y0, ang = r2() * 6.28; for (let i = 0; i < n; i++) { const nx = px + Math.cos(ang) * 5, ny = py + Math.sin(ang) * 5; x.strokeStyle = 'rgba(40,8,6,.55)'; x.lineWidth = wd; x.beginPath(); x.moveTo(px, py); x.lineTo(nx, ny); x.stroke(); xb.strokeStyle = 'rgba(20,20,20,.8)'; xb.lineWidth = wd * .7; xb.beginPath(); xb.moveTo(px / 2, py / 2); xb.lineTo(nx / 2, ny / 2); xb.stroke(); px = nx; py = ny; ang += (r2() - .5) * .9; if (r2() < .05) fissura(px, py, n * .4, wd * .7); } };
      for (let i = 0; i < 40; i++) fissura(r2() * 512, r2() * 512, 6 + r2() * 14, .8 + r2() * 1.4);
      for (let i = 0; i < 1800; i++) { x.fillStyle = `rgba(${r2() < .5 ? '90,30,20' : '255,230,220'},${r2() * .12})`; x.fillRect(r2() * 512, r2() * 512, 2, 2); }
      for (let i = 0; i < 0; i++) { xb.fillStyle = `rgba(${r2() < .5 ? '0,0,0' : '255,255,255'},${r2() * .3})`; xb.beginPath(); xb.arc(r2() * 256, r2() * 256, .6 + r2(), 0, 7); xb.fill(); }
      const tCarne = K.tex(c, [2, 2]), tRel = K.tex(cb, [2, 2]);
      const mCarne = mat({ mapa: tCarne, bump: tRel, bs: .12, r: .62, vc: true });
      // ferro enferrujado
      const [cf, xf] = K.tela(256, 256), r3 = K.rngDe(505);
      xf.fillStyle = '#3e2c22'; xf.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 160; i++) { xf.fillStyle = ['rgba(140,70,30,.5)', 'rgba(170,92,40,.45)', 'rgba(30,20,16,.5)', 'rgba(90,70,60,.4)'][Math.floor(r3() * 4)]; xf.beginPath(); xf.ellipse(r3() * 256, r3() * 256, 3 + r3() * 18, 2 + r3() * 10, r3() * 3, 0, 7); xf.fill(); }
      for (let i = 0; i < 50; i++) { const sx = r3() * 256, sy = r3() * 256; xf.strokeStyle = 'rgba(150,70,25,.35)'; xf.lineWidth = 1 + r3() * 3; xf.beginPath(); xf.moveTo(sx, sy); xf.lineTo(sx + (r3() - .5) * 4, sy + 8 + r3() * 20); xf.stroke(); }
      for (let i = 0; i < 900; i++) { xf.fillStyle = `rgba(0,0,0,${r3() * .5})`; xf.fillRect(r3() * 256, r3() * 256, 1.5, 1.5); }
      const tFerro = K.tex(cf, [2, 1]);
      const mFerro = mat({ mapa: tFerro, bump: tFerro, bs: .15, r: .78, me: .7 });
      const mBoca = mat({ cor: '#120202', r: .3 });
      const mDente = mat({ cor: '#a8987a', r: .5 });
      const mOlho = mat({ cor: '#201004', e: '#ffc060', ei: .55, r: .05 });

      const P = (fq, prof, bojo, esc) => placas(fq, prof, bojo, esc);
      const corpo = junta(g, 0, 0, 0);
      const quadril = junta(corpo, 0, 1.59, 0);

      /* ---------- pernas grossas e pés enormes ---------- */
      const pernas = [-1, 1].map(sd => {
        const coxa = junta(quadril, sd * .3, -.08, 0); coxa.rotation.z = sd * .06;
        malha(coxa, tubo([[0, .2, -.02], [0, -.34, .06], [0, -.74, .05]], [[.25, .27], [.28, .3], [.22, .24], [.18, .19]], { nr: 26, nl: 20, ...P(5.5, .03, .03), fim: .8 }), mCarne);
        const joelho = junta(coxa, 0, -.74, .05);
        malha(joelho, tubo([[0, .12, .02], [0, -.28, -.04], [0, -.64, -.01]], [[.18, .2], [.2, .25], [.15, .17], [.13, .14]], { nr: 24, nl: 18, ...P(6, .025, .025, .9), ini: .8, fim: .6 }), mCarne);
        const tornozelo = junta(joelho, 0, -.64, -.01); tornozelo.rotation.z = -sd * .06;
        const pe = [tubo([[0, .04, -.14], [0, -.05, .08], [0, -.08, .3]], [[.15, .13], [.18, .11], [.2, .07]], { nr: 18, nl: 12, ...P(7, .02, .02, .85), fim: .3 })];
        for (let i = 0; i < 5; i++) { const xx = (i - 2) * .075 + sd * .01, l = (.16 - Math.abs(i - (sd > 0 ? 1.4 : 2.6)) * .02); pe.push(tubo([[xx, -.07, .27], [xx * 1.1, -.09, .27 + l * .6], [xx * 1.15, -.12, .27 + l]], [.045 - Math.abs(i - 2) * .004, .04, .03], { nr: 9, nl: 6, ...P(9, .01, .01, .8), fim: .9 })); }
        malha(tornozelo, juntar(pe), mCarne);
        return { coxa, joelho, tornozelo, sd };
      });

      /* ---------- tronco curvado: barriga, peito em barril, corcova de músculo atrás da cabeça ---------- */
      malha(quadril, tubo([[0, -.28, -.02], [0, .05, 0], [0, .42, .05]], [[.44, .34], [.43, .34], [.5, .38]], { nr: 30, nl: 14, ...P(5, .03, .03), ini: .7 }), mCarne);
      const peito = junta(quadril, 0, .38, .04); peito.rotation.x = .42;
      const emPlacas = (geo, pl, k = 1) => { geo.computeVertexNormals(); const p = geo.attributes.position, n = geo.attributes.normal, cc = new Float32Array(p.count * 3), qq = {}; for (let i = 0; i < p.count; i++) { qq.x = p.getX(i); qq.y = p.getY(i); qq.z = p.getZ(i); const d = pl.deform(qq) * k; p.setXYZ(i, qq.x + n.getX(i) * d, qq.y + n.getY(i) * d, qq.z + n.getZ(i) * d); cc.set(pl.cor(), i * 3); } geo.setAttribute('color', new T.BufferAttribute(cc, 3)); return K.suavizar(geo); };
      const NUC = new T.Vector3(.26, .58, .53), raios = Array.from({ length: 9 }, (_, i) => i / 9 * Math.PI * 2 + K.rng() * .4);
      const plPeito = P(4.5, .035, .04);
      const corPeito = q => { const c0 = plPeito.cor(), dx = q.x - NUC.x, dy = q.y - NUC.y, d = Math.hypot(dx, dy, (q.z - NUC.z) * .5); if (d > .55) return c0; const a = Math.atan2(dy, dx); let k = 0; raios.forEach((r0, i) => { const da = Math.abs(Math.atan2(Math.sin(a - r0 - Math.sin(d * 14 + i) * .12), Math.cos(a - r0 - Math.sin(d * 14 + i) * .12))); k = Math.max(k, Math.max(0, 1 - da * d / (.012 + d * .02))); }); k *= 1 - d / .55; const esc = 1 - Math.min(1, k) * .9, roxo = Math.min(1, k) * Math.max(0, 1 - d / .25) * .25; return [c0[0] * esc + roxo * .5, c0[1] * esc, c0[2] * esc + roxo]; };
      malha(peito, juntar([
        tubo([[0, -.08, 0], [0, .3, .07], [0, .72, .1], [0, 1.08, .02], [0, 1.3, -.12]], [[.47, .35], [.6, .43], [.72, .5], [.66, .46], [.36, .3]], { nr: 40, nl: 30, deform: plPeito.deform, cor: corPeito }),
        por(emPlacas(bolha(.62, .34, .44, { ws: 30, hs: 20 }), P(4.5, .035, .04)), [0, 1.04, -.2]),
        ...[-1, 1].map(sd => { const gg = por(emPlacas(bolha(.34, .22, .13, { ws: 22, hs: 14 }), P(5, .03, .03)), [sd * .3, .68, .42], [.25, sd * .35, sd * -.1]); if (sd > 0) { const p = gg.attributes.position, c = gg.attributes.color, q = {}; for (let i = 0; i < p.count; i++) { q.x = p.getX(i); q.y = p.getY(i); q.z = p.getZ(i); const dx = q.x - NUC.x, dy = q.y - NUC.y, d = Math.hypot(dx, dy); if (d < .5) { const a = Math.atan2(dy, dx); let k = 0; raios.forEach((r0, j) => { const da = Math.abs(Math.atan2(Math.sin(a - r0 - Math.sin(d * 14 + j) * .12), Math.cos(a - r0 - Math.sin(d * 14 + j) * .12))); k = Math.max(k, Math.max(0, 1 - da * d / (.012 + d * .02))); }); const e = 1 - Math.min(1, k * (1 - d / .5)) * .9; c.setXYZ(i, c.getX(i) * e, c.getY(i) * e, c.getZ(i) * e); } } } return gg; }),
        ...[0, 1, 2].map(i => por(emPlacas(bolha(.22 - i * .02, .11, .08, { ws: 14, hs: 8 }), P(7, .02, .02, .9)), [0, .1 + i * .17, .45 - i * .01])),
      ]), mCarne);
      const nuc = K.nucleo(peito, .065, [.26, .58, .53], [-.15, .35, 0], { pernas: 10 });

      /* ---------- cabeça pequena, baixa e projetada à frente ---------- */
      const pesc = junta(peito, 0, .92, .5); pesc.rotation.x = -.1;
      malha(pesc, tubo([[0, -.14, -.1], [0, .0, .0], [0, .1, .06]], [[.3, .25], [.24, .21], [.2, .18]], { nr: 20, nl: 8, ...P(7, .02, .02, .9) }), mCarne);
      const cab = junta(pesc, 0, .1, .1); cab.rotation.x = .05;
      const gauss = (x0, y0, z0, cx, cy, cz, sx, sy, a) => a * Math.exp(-(((x0 - cx) / sx) ** 2 + ((y0 - cy) / sy) ** 2 + ((z0 - cz) / sx) ** 2));
      const pl = P(8, .018, .015, 1);
      // crânio baixo e largo, testa pesada, órbitas fundas, nariz achatado
      const cabG = emPlacas(bolha(.2, .2, .2, {
        ws: 36, hs: 28,
        def: (x0, y0, z0) => {
          let kk = 1 + [-1, 1].reduce((sum, sd) => sum + gauss(x0, y0, z0, sd * .38, .3, .9, .34, .1, .2) - gauss(x0, y0, z0, sd * .35, .1, .93, .17, .12, .2) + gauss(x0, y0, z0, sd * .62, -.15, .75, .25, .2, .1), 0);
          kk += gauss(x0, y0, z0, 0, -.08, 1, .18, .15, .16) - gauss(x0, y0, z0, 0, -.45, .9, .4, .12, .12);
          if (y0 > .2) { y0 *= .85; }
          return [x0 * kk * 1.08, y0 * kk, z0 * kk];
        },
      }), pl, .8);
      // frente real do crânio num ponto (para os olhos e a boca ficarem na superfície)
      const frente = (geo, x0, y0, tol = .03) => { const p = geo.attributes.position; let z = -9; for (let i = 0; i < p.count; i++) if (Math.abs(p.getX(i) - x0) < tol && Math.abs(p.getY(i) - y0) < tol) z = Math.max(z, p.getZ(i)); return z; };
      malha(cab, cabG, mCarne, [0, .12, 0]);
      // mandíbula pesada (abre devagar)
      const mand = junta(cab, 0, .06, -.02);
      const mandG = emPlacas(bolha(.17, .09, .17, { ws: 26, hs: 16, def: (x0, y0, z0) => [x0 * (1 - Math.max(0, z0) * .2), y0 - Math.max(0, z0) * .15, z0 * 1.1] }), P(9, .015, .012, .9), .8);
      malha(mand, mandG, mCarne, [0, -.04, .06]);
      const zBoca = frente(cabG, 0, -.07, .05), zMand = frente(mandG, 0, .0, .05) + .06;
      malha(cab, bolha(.1, .05, .07), mBoca, [0, .06, zBoca - .085]);
      const dentes = [], dentesB = [];
      for (let i = 0; i < 10; i++) { const a = (i / 9 - .5) * 1.7; dentes.push(por(new T.ConeGeometry(.016, .045 + (i % 3 === 0 ? .025 : 0), 5), [Math.sin(a) * .095, .06, zBoca - .028 - (1 - Math.cos(a)) * .08], [Math.PI, a, (K.rng() - .5) * .3])); }
      for (let i = 0; i < 9; i++) { const a = (i / 8 - .5) * 1.6; dentesB.push(por(new T.ConeGeometry(.015, .04 + (i === 1 || i === 7 ? .035 : 0), 5), [Math.sin(a) * .09, -.035, zMand - .03 - (1 - Math.cos(a)) * .08], [0, a, (K.rng() - .5) * .3])); }
      malha(cab, juntar(dentes), mDente);
      malha(mand, juntar(dentesB), mDente);
      [-1, 1].forEach(sd => { const zo = frente(cabG, sd * .07, .02, .025); malha(cab, new T.SphereGeometry(.014, 10, 8), mOlho, [sd * .07, .14, zo - .004]); });
      /* ---------- braços enormes, algemas e correntes partidas ---------- */
      const correntes = [];
      const algema = (pai, y, rIn, alt, lado = 1, nE = 4 + Math.floor(K.rng() * 3)) => {
        const prof = [[rIn, -alt / 2], [rIn + .045, -alt / 2], [rIn + .05, -alt / 2 + .02], [rIn + .05, alt / 2 - .02], [rIn + .045, alt / 2], [rIn, alt / 2], [rIn, -alt / 2]].map(([a, b]) => new T.Vector2(a, b));
        const pecas = [new T.LatheGeometry(prof, 40)];
        [-1, 1].forEach(e => pecas.push(por(new T.TorusGeometry(rIn + .052, .014, 6, 40), [0, e * (alt / 2 - .025), 0], [Math.PI / 2, 0, 0])));
        for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; [-1, 1].forEach(e => pecas.push(por(new T.SphereGeometry(.014, 6, 4), [Math.sin(a) * (rIn + .062), e * (alt / 2 - .025), Math.cos(a) * (rIn + .062)]))); }
        pecas.push(por(new T.BoxGeometry(.06, alt * .8, .1), [rIn + .07, 0, 0]), por(new T.CylinderGeometry(.025, .025, alt * .9, 8), [-rIn - .06, 0, 0]));
        malha(pai, juntar(pecas), mFerro, [0, y, 0]);
        // corrente partida pendurada
        let elo = junta(pai, lado * (rIn + .06), y - alt / 2 + .01, .03); const elos = [];
        for (let i = 0; i < nE; i++) {
          const ultimo = i === nE - 1, geo = new T.TorusGeometry(.055, .019, 6, 14, ultimo ? Math.PI * 1.45 : Math.PI * 2);
          geo.scale(1, 1.55, 1); geo.translate(0, -.075, 0);
          malha(elo, geo, mFerro, null, [0, i % 2 ? Math.PI / 2 : 0, ultimo ? .5 : 0]);
          elos.push(elo); elo = junta(elo, 0, -.15, 0);
        }
        correntes.push(elos);
      };
      const bracos = [-1, 1].map(sd => {
        const ombro = junta(peito, sd * .68, .98, .02); ombro.rotation.set(-.55, 0, sd * .22);
        malha(ombro, emPlacas(bolha(.3, .38, .3, { ws: 24, hs: 16 }), P(5, .035, .035)), [0, -.08, 0]);
        malha(ombro, tubo([[0, .14, 0], [0, -.45, .05], [0, -1.0, 0]], [[.26, .27], [.28, .32], [.23, .25], [.2, .21]], { nr: 28, nl: 22, ...P(5, .03, .03), fim: .8 }), mCarne);
        const cotov = junta(ombro, 0, -1.0, 0); cotov.rotation.x = -.35;
        malha(cotov, tubo([[0, .1, 0], [0, -.35, .03], [0, -.92, .02]], [[.22, .23], [.26, .26], [.21, .2], [.18, .16]], { nr: 28, nl: 22, ...P(5.5, .03, .03, .95), ini: .8, fim: .6 }), mCarne);
        algema(cotov, -.76, .2, .24, sd);
        const pulso = junta(cotov, 0, -.92, .02);
        malha(pulso, tubo([[0, .06, 0], [0, -.14, .04], [0, -.3, .06]], [[.12, .16], [.13, .22], [.11, .21]], { nr: 20, nl: 10, ...P(8, .015, .02, .85) }), mCarne);
        const dedos = [];
        for (let i = 0; i < 5; i++) {
          const pol = i === 4, zz = pol ? .2 : .12 - i * .085, d = junta(pulso, pol ? -sd * .03 : 0, pol ? -.08 : -.28, zz);
          const l = pol ? .2 : .26 - Math.abs(i - 1) * .025, cc = -sd;
          const pts = pol ? [[0, 0, 0], [cc * .03, -.08, .06], [cc * .06, -.15, .08]] : [[0, 0, 0], [cc * .01, -l * .45, 0], [cc * .06, -l * .8, 0], [cc * .12, -l * .95, 0]];
          malha(d, tubo(pts, pol ? [.06, .05, .04] : [.055, .052, .046, .04], { nr: 12, nl: 10, ...P(11, .01, .012, .8), fim: .8, ini: .9 }), mCarne);
          d.userData = { pol }; dedos.push(d);
        }
        return { ombro, cotov, pulso, dedos, sd };
      });
      // algema no tornozelo direito com um pedaço de corrente
      algema(pernas[1].joelho, -.54, .15, .2, 1, 2);

      /* ---------- anel de poeira no chão a cada passo pesado ---------- */
      const mPo = F.guardar(new T.MeshBasicMaterial({ color: L('#7a6a5c'), transparent: true, opacity: 0, depthWrite: false }));
      const ondas = [0, 1].map(() => { const me = malha(g, new T.RingGeometry(.7, 1, 40), mPo.clone(), [0, .02, 0], [-Math.PI / 2, 0, 0]); F.guardar(me.material); me.userData.t = 9; return me; });

      // escala final: o topo da corcova fica em ~3,4 m
      const caixa0 = new T.Box3().setFromObject(g), ALT = 3.4, esc = ALT / caixa0.max.y; corpo.scale.setScalar(esc);

      /* ---------- animação: respiração funda, cabeça lenta, punhos, passos pesados ---------- */
      const ra = K.rngDe(K.semente + 51), des = ra() * 10;
      let fase = 0, ritmo = 0, ultPasso = 0;
      const ap = (o, k2, v, vel, dt) => { o[k2] += (v - o[k2]) * Math.min(1, dt * vel); };
      const anim = (dt, t, andando) => {
        const tt = t + des;
        const resp = Math.sin(tt * .9) + Math.sin(tt * .37) * .4;
        peito.scale.set(1 + resp * .018, 1 + resp * .01, 1 + resp * .025);
        nuc.pulso(tt);
        cab.rotation.y = Math.sin(tt * .23) * .35 + Math.sin(tt * .71) * .05;
        cab.rotation.x = .05 + Math.sin(tt * .5) * .05;
        mand.rotation.x = .12 + Math.max(0, Math.sin(tt * .9)) * .12;
        ritmo += ((andando ? 1 : 0) - ritmo) * Math.min(1, dt * 3);
        if (andando) fase += dt * 2.2;
        const sn = Math.sin(fase), R = ritmo;
        pernas.forEach((p, i) => {
          const s2 = i ? -sn : sn;
          ap(p.coxa.rotation, 'x', -s2 * .32 * R, 8, dt);
          ap(p.joelho.rotation, 'x', (.1 + Math.max(0, Math.sin(fase + (i ? Math.PI : 0) + 1.2)) * .5) * R + .06, 8, dt);
          ap(p.tornozelo.rotation, 'x', s2 * .15 * R, 8, dt);
        });
        // impacto de cada passo: corpo afunda, ombros sacodem, anel de poeira
        const imp = Math.pow(Math.abs(Math.cos(fase)), 6);
        corpo.position.y = R * (-.05 - imp * .06) * esc;
        corpo.rotation.z = R * sn * .07 + (1 - R) * Math.sin(tt * .3) * .015;
        peito.rotation.x = .42 + R * imp * .05 + Math.sin(tt * .9) * .01;
        peito.rotation.y = -R * sn * .1;
        const passo = Math.floor((fase + Math.PI / 2) / Math.PI);
        if (R > .5 && passo !== ultPasso) { ultPasso = passo; const o = ondas[passo & 1], pe = pernas[(passo & 1) ? 0 : 1]; o.userData.t = 0; o.position.set(pe.sd * .3 * esc, .02, .25 * esc); }
        ondas.forEach(o => { o.userData.t += dt; const u = o.userData.t / .9; o.visible = u < 1; if (u < 1) { o.scale.setScalar((.4 + u * 1.6) * esc); o.material.opacity = .6 * (1 - u); } });
        bracos.forEach((b, i) => {
          const s2 = i ? sn : -sn;
          ap(b.ombro.rotation, 'x', -.55 + R * s2 * .22 + (1 - R) * Math.sin(tt * .5 + i) * .03, 4, dt);
          ap(b.cotov.rotation, 'x', -.35 - R * imp * .08, 4, dt);
          const fecha = .2 + .5 * (.5 + .5 * Math.sin(tt * .6 + i * 1.7));
          b.dedos.forEach((d, j) => { d.rotation.z = -b.sd * (d.userData.pol ? fecha * .4 : fecha + j * .05); });
        });
        // correntes balançam com atraso
        correntes.forEach((elos, ci) => elos.forEach((e, j) => { e.rotation.x = Math.sin(tt * 2.1 - j * .6 + ci) * (.08 + R * .25) + (ci < 2 ? .55 - R * .1 : 0); e.rotation.z = Math.sin(tt * 1.7 - j * .5 + ci * 2) * (.05 + R * .15); }));
      };
      anim(0, 0, false);
      return { g, alt: ALT, raioBase: .95, anim };
    },
  };
})();

// toda forma instala o BufferGeometryUtils antes de montar
(() => {
  const NS = window.ACF3D || {};
  Object.values(NS.formasFilho || {}).forEach(d => { const c = d.criar; d.criar = (F, s) => { NS.instalarBGU(); return c(F, s); }; });
})();
