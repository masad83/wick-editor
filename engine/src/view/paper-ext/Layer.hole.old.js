/*
 * Copyright 2019 WICKLETS LLC
 *
 * This file is part of Paper.js-drawing-tools.
 *
 * Paper.js-drawing-tools is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Paper.js-drawing-tools is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Paper.js-drawing-tools.  If not, see <https://www.gnu.org/licenses/>.
 */

/*
    paper-hole.js
    Adds hole() to the paper Layer class which finds the shape of the hole
    at a certain point. Use this to make a vector fill bucket!

    This version uses a flood fill + potrace method of filling holes.

    Adapted from the FillBucket tool from old Wick

    by zrispo (github.com/zrispo) (zach@wickeditor.com)
 */

(function () {

    var VERBOSE = false;
    var PREVIEW_IMAGE = true;

    var onError;
    var onFinish;

    var layer;
    var layerGroup;
    var layerPathsGroup;
    var layerPathsRaster;
    var layerPathsImageData;
    var layerPathsImageDataFloodFilled;
    var layerPathsImageDataFloodFilledAndProcessed;
    var layerPathsImageFloodFilledAndProcessed;

    var floodFillX;
    var floodFillY;
    var floodFillCanvas;
    var floodFillCtx;
    var floodFillImageData;
    var floodFillProcessedImage;

    var resultHolePath;

    var N_RASTER_CLONE = 1;
    var RASTER_BASE_RESOLUTION = 1.9;
    var FILL_TOLERANCE = 35;
    var CLONE_WIDTH_SHRINK = 1.0;
    var SHRINK_AMT = 0.85;

    function tryToChangeColorOfExistingShape () {

    }

    function createLayerPathsGroup (callback) {
        layerGroup = new paper.Group({insert:false});
        layer.children.forEach(function (child) {
            if(child._class !== 'Path' && child._class !== 'CompoundPath') return;
            for(var i = 0; i < N_RASTER_CLONE; i++) {
                var clone = child.clone({insert:false});
                if(clone.strokeWidth !== 0 && clone.strokeWidth <= 1) {
                    clone.strokeWidth = 1.5
                }
                clone.strokeWidth *= CLONE_WIDTH_SHRINK;
                layerGroup.addChild(clone);
            }
        });
        if(layerGroup.children.length === 0) {
            onError('NO_PATHS');
        } else {
            callback();
        }
    }

    function rasterizeLayerGroup () {
        var rasterResolution = paper.view.resolution * RASTER_BASE_RESOLUTION / window.devicePixelRatio;
        layerPathsRaster = layerGroup.rasterize(rasterResolution, {insert:false});
    }

    function generateImageDataFromRaster () {
        var rasterCanvas = layerPathsRaster.canvas;
        var rasterCtx = rasterCanvas.getContext('2d');
        layerPathsImageData = rasterCtx.getImageData(0, 0, layerPathsRaster.width, layerPathsRaster.height);
    }

    function floodfillImageData (callback) {
        var rasterPosition = layerPathsRaster.bounds.topLeft;
        var x = (floodFillX - rasterPosition.x) * RASTER_BASE_RESOLUTION;
        var y = (floodFillY - rasterPosition.y) * RASTER_BASE_RESOLUTION;
        x = Math.round(x);
        y = Math.round(y);

        floodFillCanvas = document.createElement('canvas');
        floodFillCanvas.width = layerPathsRaster.canvas.width;
        floodFillCanvas.height = layerPathsRaster.canvas.height;

        if(x < 0 || y < 0 || x >= floodFillCanvas.width || y >= floodFillCanvas.height) {
            onError('OUT_OF_BOUNDS');
        } else {
            floodFillCtx = floodFillCanvas.getContext('2d');
            floodFillCtx.putImageData(layerPathsImageData, 0, 0);
            floodFillCtx.fillStyle = "rgba(123,124,125,1)";
            floodFillCtx.fillFlood(x, y, FILL_TOLERANCE);
            floodFillImageData = floodFillCtx.getImageData(0,0,floodFillCanvas.width,floodFillCanvas.height);
            callback();
        }
    }

    function processImageData (callback) {
        var imageDataRaw = floodFillImageData.data;

        for(var i = 0; i < imageDataRaw.length; i += 4) {
          if(imageDataRaw[i] === 123 && imageDataRaw[i+1] === 124 && imageDataRaw[i+2] === 125) {
            imageDataRaw[i] = 0;
            imageDataRaw[i+1] = 0;
            imageDataRaw[i+2] = 0;
            imageDataRaw[i+3] = 255;
          } else if(imageDataRaw[i+3] !== 0) {
            imageDataRaw[i] = 255;
            imageDataRaw[i+1] = 0;
            imageDataRaw[i+2] = 0;
            imageDataRaw[i+3] = 255;
          } else {
            imageDataRaw[i] = 1;
            imageDataRaw[i+1] = 0;
            imageDataRaw[i+2] = 0;
            imageDataRaw[i+3] = 0;
          }
        }

        var w = floodFillCanvas.width;
        var h = floodFillCanvas.height;
        var r = 4;
        for(var this_x = 0; this_x < w; this_x++) {
            for(var this_y = 0; this_y < h; this_y++) {
                var thisPix = getPixelAt(this_x, this_y, w, h, imageDataRaw);
                if(thisPix && thisPix.r === 255) {
                    for(var offset_x = -r; offset_x <= r; offset_x++) {
                        for(var offset_y = -r; offset_y <= r; offset_y++) {
                            var other_x = this_x+offset_x;
                            var other_y = this_y+offset_y;
                            var otherPix = getPixelAt(other_x, other_y, w, h, imageDataRaw);
                            if(otherPix && otherPix.r === 0) {
                                setPixelAt(this_x, this_y, w, h, imageDataRaw, {
                                    r: 1,
                                    g: 255,
                                    b: 0,
                                    a: 255,
                                });
                            }
                        }
                    }
                }
            }
        }

        for(var i = 0; i < imageDataRaw.length; i += 4) {
          if(imageDataRaw[i] === 255) {
            imageDataRaw[i] = 0;
            imageDataRaw[i+1] = 0;
            imageDataRaw[i+2] = 0;
            imageDataRaw[i+3] = 0;
          }
        }

        floodFillCtx.putImageData(floodFillImageData, 0, 0);

        floodFillProcessedImage = new Image();
        floodFillProcessedImage.onload = function () {
            if(PREVIEW_IMAGE) previewImage(floodFillProcessedImage);
            callback();
        }
        floodFillProcessedImage.src = floodFillCanvas.toDataURL();
    }

    function checkForLeakyHole (callback) {
        var holeIsLeaky = false;
        var w = floodFillProcessedImage.width;
        var h = floodFillProcessedImage.height;
        for(var x = 0; x < floodFillProcessedImage.width; x++) {
            if(getPixelAt(x,0,w,h,floodFillImageData.data).r === 0 &&
               getPixelAt(x,0,w,h,floodFillImageData.data).a === 255) {
                holeIsLeaky = true;
                onError('LEAKY_HOLE');
                break;
            }
        }

        if(!holeIsLeaky) {
            callback();
        }
    }

    function potraceImageData () {
        var svgString = potrace.fromImage(floodFillProcessedImage).toSVG(1);
        var xmlString = svgString
          , parser = new DOMParser()
          , doc = parser.parseFromString(xmlString, "text/xml");
        resultHolePath = paper.project.importSVG(doc, {insert:true});
        resultHolePath.remove();
        resultHolePath = resultHolePath.children[0];
    }

    function processFinalResultPath () {
        resultHolePath.scale(1/RASTER_BASE_RESOLUTION, new paper.Point(0,0))
        var rasterPosition = layerPathsRaster.bounds.topLeft;
        resultHolePath.position.x += rasterPosition.x;
        resultHolePath.position.y += rasterPosition.y;
        resultHolePath.applyMatrix = true;
        expandHole(resultHolePath);
    }

    /* Utilities */

    function getPixelAt (x,y,width,height,imageData) {
        if(x<0 || y<0 || x>=width || y>=height) return null;

        var offset = (y*width+x)*4;
        return {
            r: imageData[offset],
            g: imageData[offset+1],
            b: imageData[offset+2],
            a: imageData[offset+3]
        }
    }

    function setPixelAt (x,y,width,height,imageData,color) {
        var offset = (y*width+x)*4;
        imageData[offset] = color.r
        imageData[offset+1] = color.g
        imageData[offset+2] = color.b
        imageData[offset+3] = color.a
    }

    // http://www.felixeve.co.uk/how-to-rotate-a-point-around-an-origin-with-javascript/
    function rotate_point(pointX, pointY, originX, originY, angle) {
        angle = angle * Math.PI / 180.0;
        return {
            x: Math.cos(angle) * (pointX-originX) - Math.sin(angle) * (pointY-originY) + originX,
            y: Math.sin(angle) * (pointX-originX) + Math.cos(angle) * (pointY-originY) + originY
        };
    }

    function previewImage (image) {
        var win = window.open('', 'Title', 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, width='+image.width+', height='+image.height+', top=100, left=100');
        win.document.body.innerHTML = '<div><img src= '+image.src+'></div>';
    }

    function expandHole (path) {
        if(path instanceof paper.Group) {
            path = path.children[0];
        }

        var children;
        if(path instanceof paper.Path) {
            children = [path];
        } else if(path instanceof paper.CompoundPath) {
            children = path.children;
        }

        children.forEach(function (hole) {
            var normals = [];
            hole.closePath();
            hole.segments.forEach(function (segment) {
                var a = segment.previous.point;
                var b = segment.point;
                var c = segment.next.point;

                var ab = {x: b.x-a.x, y: b.y-a.y};
                var cb = {x: b.x-c.x, y: b.y-c.y};

                var d = {x: ab.x-cb.x, y: ab.y-cb.y};
                d.h = Math.sqrt((d.x*d.x)+(d.y*d.y));
                d.x /= d.h;
                d.y /= d.h;

                d = rotate_point(d.x, d.y, 0, 0, 90);

                normals.push({x:d.x,y:d.y});
            });

            for (var i = 0; i < hole.segments.length; i++) {
                var segment = hole.segments[i];
                var normal = normals[i];
                segment.point.x += normal.x*-SHRINK_AMT;
                segment.point.y += normal.y*-SHRINK_AMT;
            }
        });
    }

    /* Add hole() to paper.Layer */

    paper.Layer.inject({
        hole: function(args) {
            if(!args) console.error('paper.hole: args is required');
            if(!args.point) console.error('paper.hole: args.point is required');
            if(!args.onFinish) console.error('paper.hole: args.onFinish is required');
            if(!args.onError) console.error('paper.hole: args.onError is required');

            onFinish = args.onFinish;
            onError = args.onError;

            layer = this;
            floodFillX = args.point.x;
            floodFillY = args.point.y;

            tryToChangeColorOfExistingShape();
            createLayerPathsGroup(function () {
                rasterizeLayerGroup();
                generateImageDataFromRaster();
                floodfillImageData(function () {
                    processImageData(function () {
                        checkForLeakyHole(function () {
                            potraceImageData();
                            processFinalResultPath();
                            onFinish(resultHolePath);
                        });
                    });
                });
            });
        }
    });

})();
