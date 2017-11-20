class Viewer {
    constructor(props) {
        this.pdfDoc = null;
        this.pageNum = 1;
        this.pageRendering = false;
        this.pageNumPending = null;
        this.scale = 1;
        this.rotation = 0;
        this.canvas = document.getElementById('canvas')
        this.ctx = canvas.getContext('2d')
    }
    renderPage(num) {
        this.pageRendering = true
        var self = this
        // Using promise to fetch the page
        self.pdfDoc.getPage(num).then(function (page) {
            var viewport = page.getViewport(self.scale, self.rotation);
            self.canvas.height = viewport.height;
            self.canvas.width = viewport.width;

            // Render PDF page into canvas context
            var renderContext = {
                canvasContext: self.ctx,
                viewport: viewport
            };
            var renderTask = page.render(renderContext);

            // Wait for rendering to finish
            renderTask.promise.then(function () {
                self.pageRendering = false;
                if (self.pageNumPending !== null) {
                    // Now page rendering is pending
                    self.renderPage(self.pageNumPending);
                    self.pageNumPending = null
                }
            });
        });
        // Update page counters
        document.getElementById('pageNumber').value = self.pageNum
    }
    queueRenderPage(num) {
        if (this.pageRendering) {
            this.pageNumPending = num;
        } else {
            this.renderPage(num);
        }
    }
    onPrevPage() {
        if (this.pageNum <= 1) {
            return;
        }
        this.pageNum--;
        this.queueRenderPage(this.pageNum);
    }
    onNextPage() {
        if (this.pageNum >= this.numPages) {
            return;
        }
        this.pageNum++;
        this.queueRenderPage(this.pageNum);
    }
    zoom(times) {
        if (times < 0.26 || times > 3.82) {
            return false;
        }
        this.scale = times
        var value = Math.round(this.scale * 100)
        var customScaleOption = document.getElementById('customScaleOption');
        customScaleOption.setAttribute('value', value)
        document.getElementById('customScaleOption').innerHTML = value + '%'
        // document.getElementById('scale').value = value
        this.renderPage(this.pageNum)
    }
    rotate(deg) {
        this.rotation += deg
        this.renderPage(this.pageNum)
    }
}
var getRequest = function () {
    var url = window.location.href
    var request = new Object();
    if (url.indexOf("?") != -1) {
        var str = url.split('?')[1];
        strs = str.split("&");
        for (var i = 0; i < strs.length; i++) {
            request[strs[i].split("=")[0]] = (strs[i].split("=")[1]);
        }
    }
    return request;
}

var main = function () {
    // If absolute URL from the remote server is provided, configure the CORS
    // header on that server.
    var url = './test.pdf';
    var request = getRequest();
    if (request.file) {
        url = decodeURIComponent(request.file)
    }

    // The workerSrc property shall be specified.
    PDFJS.workerSrc = './pdf.worker.js';

    var tool = $('.tool-box')[0]

    var buttons = {
        previous: document.getElementById('previous'),
        next: document.getElementById('next'),
        zoomIn: document.getElementById('zoomIn'),
        zoomOut: document.getElementById('zoomOut'),
        rotate: document.getElementById('pageRotateCw'),
        fullscreen: document.getElementById('presentationMode')
    }

    var icons = {
        previous: document.getElementsByClassName('pre-small-previous')[0],
        next: document.getElementsByClassName('pre-small-next')[0],
        enlarge: document.getElementsByClassName('pre-option-enlarge')[0],
        shrink: document.getElementsByClassName('pre-option-shrink')[0]
    }
    icons.previous.className = 'pre-small-previous-disabled'

    var viewer = new Viewer();
    PDFJS.getDocument(url).then(function (pdfDoc_) {
        viewer.pdfDoc = pdfDoc_;
        viewer.numPages = viewer.pdfDoc.numPages
        document.getElementById('numPages').textContent = viewer.pdfDoc.numPages;

        if (viewer.pageNum == viewer.numPages) {
            icons.next.className = 'pre-small-next-disabled'
        }

        // Initial/first page rendering
        viewer.renderPage(viewer.pageNum);
        viewer.canvas.className = '';
    });

    previous.addEventListener('click', () => {
        var target = event.target;
        var next = document.getElementsByClassName('pre-small-next-disabled')
        if (next.length) {
            next[0].className = 'pre-small-next';
        } else if (viewer.pageNum == 2) {
            target.className = 'pre-small-previous-disabled'
        }
        viewer.onPrevPage()
    });
    buttons.next.addEventListener('click', (event) => {
        var target = event.target;
        var previous = document.getElementsByClassName('pre-small-previous-disabled')
        if (previous.length) {
            previous[0].className = 'pre-small-previous';
        } else if (viewer.pageNum == viewer.numPages - 1) {
            target.className = 'pre-small-next-disabled'
        }
        viewer.onNextPage()
    });
    buttons.zoomIn.addEventListener('click', (event) => {
        var target = event.target;
        var enlarge = document.getElementsByClassName('pre-option-enlarge-disabled')
        if (viewer.scale * 1.25 > 3.81) {
            target.className = 'pre-option-shrink-disabled'
        } else if (enlarge.length) {
            enlarge[0].className = 'pre-option-enlarge';
        }
        viewer.zoom(viewer.scale * 1.25)
    });
    buttons.zoomOut.addEventListener('click', (event) => {
        var target = event.target;
        var shrink = document.getElementsByClassName('pre-option-shrink-disabled')
        if (viewer.scale * 0.8 < 0.27) {
            target.className = 'pre-option-enlarge-disabled'
        } else if (shrink.length) {
            shrink[0].className = 'pre-option-shrink';
        }
        viewer.zoom(viewer.scale * 0.8)
    });
    buttons.rotate.addEventListener('click', () => {
        viewer.rotate(90)
    });
    buttons.fullscreen.addEventListener('click', () => {
        isFullScreen = toggleFullScreen()
    })
    document.getElementById('pageNumber').addEventListener('change', (event) => {
        var target = event.target;
        var value = parseInt(target.value)
        var previous = document.getElementsByClassName('pre-small-previous-disabled')
        var next = document.getElementsByClassName('pre-small-next-disabled')
        if (value < 1 || value > viewer.numPages) {
            return false;
        } else if (value == 1) {
            icons.previous.className = 'pre-small-previous-disabled'
        } else if (value == viewer.numPages) {
            icons.next.className = 'pre-small-next-disabled'
        } else if (next.length) {
            icons.next.className = 'pre-small-next'
        } else if (previous.length) {
            icons.previous.className = 'pre-small-previous'
        }
        viewer.pageNum = value
        viewer.renderPage(value)
    });

    document.addEventListener("fullscreenchange", function (e) {
        console.log("fullscreenchange", e);
        if (tool.className.indexOf('none') > -1) {
            tool.className = 'tool-box'
        } else {
            tool.className += ' none'
        }
    });
    document.addEventListener("mozfullscreenchange", function (e) {
        console.log("mozfullscreenchange ", e);
        if (tool.className.indexOf('none') > -1) {
            tool.className = 'tool-box'
        } else {
            tool.className += ' none'
        }
    });
    document.addEventListener("webkitfullscreenchange", function (e) {
        console.log("webkitfullscreenchange", e);
        if (tool.className.indexOf('none') > -1) {
            tool.className = 'tool-box'
        } else {
            tool.className += ' none'
        }
    });
    document.addEventListener("msfullscreenchange", function (e) {
        console.log("msfullscreenchange", e);
        if (tool.className.indexOf('none') > -1) {
            tool.className = 'tool-box'
        } else {
            tool.className += ' none'
        }
    });

    $('i').on('mousemove', function () {
        var $this = $(this)[0]
        var type = $this.dataset.type
        var className = $this.className
        if (this.className.indexOf('disabled') > -1) {
            return false;
        }
        $this.className = type + '-hover';
    });
    $('i').on('mouseout', function () {
        var $this = $(this)[0]
        var type = $this.dataset.type
        var className = $this.className
        if (this.className.indexOf('disabled') > -1) {
            return false;
        }
        $this.className = type;
    });
}

var toggleFullScreen = function () {
    var doc = window.document;
    var docEl = doc.documentElement;

    var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

    if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
        requestFullScreen.call(docEl);
    } else {
        cancelFullScreen.call(doc);
    }
}

main()