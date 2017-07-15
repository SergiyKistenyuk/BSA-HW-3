function HTMLError(message) {
    this.message = message;
    this.name = 'HTMLError';
}


/*
 * Post class
 * Required: #postTemplate, #wrap
 * Throws: HTMLError
 */
class Post {
    constructor(id, title, image, description, created, tags) {
        this.id = id;
        this.title = title;
        this.image = image;
        this.description = description;
        this.created = created;
        this.tags = tags;
    }

    render() {
        if (!this.element) {
            this.element = this.getTemplate();

            this.element.dataset.id = this.id;
            this.element.querySelector('.post-image').src = this.image;
            this.element.querySelector('.post-image').alt = this.title;
            this.element.querySelector('.post-title').innerHTML = this.title;
            this.element.querySelector('.post-description').innerHTML = this.description;
            this.element.querySelector('.post-date').innerHTML = this.created.toLocaleString();
            this.element.querySelector('.post-tags').innerHTML = this.tags;
        }

        document.querySelector('#wrap').appendChild(this.element);
    }

    getTemplate() {
        let template = document.querySelector('#postTemplate');
        if (!template) {
            throw new HTMLError("Could not find post template.");
        }
        let element = template.cloneNode(true);
        element.removeAttribute('id');
        return element;
    }
    
    getTopPosition() {
        return this.element.getBoundingClientRect().top;
    }
    
    clear() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    compare(post) {
        return (post.created.getTime() - this.created.getTime());
    }
    
    matchTitle(query) {
        return (this.title.toLowerCase().indexOf(query) !== -1);
    }
    
    getNumberOfMatchedTags(activeTags) {
        let result = 0;
        activeTags.forEach(function(activeTag) {
            this.tags.forEach(function(postTag) {
                if (activeTag == postTag) {
                    result++;
                }
            });
        }, this);
        return result;
    }
}


/*
 * PostsList class
 * Required: #postTemplate, #wrap
 * Throws: HTMLError
 */
class PostsList {
    // posts - array of Post
    constructor(posts, tagsFilter, pageSize = 10) {
        this.posts = posts;
        this.tagsFilter = tagsFilter;
        this.tagsFilter.setPostsList(this);
        this.pageSize = pageSize;
        this.titleQuery = '';
        this.rendered = 0;
    }

    static createFromPostsData(posts, tagsFilter, pageSize) {
        return new PostsList(PostsList.parsePosts(posts), tagsFilter, pageSize);
    }

    static parsePosts(posts) {
        return posts.map(
            (post, index) => new Post(index, post.title, post.image, post.description, new Date(post.createdAt), post.tags)
        );
    }
    
    renderAll() {
        this.posts.forEach((post) => {
            post.render();
        });
    }

    render() {
        for(let i = 0; (i < this.pageSize) && (this.rendered < this.posts.length); this.rendered++) {
            if (!this.hasTitleQuery() || this.posts[this.rendered].matchTitle(this.titleQuery)) {
                this.posts[this.rendered].render();
                i++;
            }
        }
    }
    
    setTitleQuery(query) {
        this.titleQuery = query.toLowerCase().trim();
    }
    
    hasTitleQuery() {
        return (this.titleQuery != '');
    }
    
    checkPostByTitle(query, post) {
        return (post.title.toLowerCase().indexOf(query) !== -1);
    }
    
    getLastPostTopPosition() {
        var pos = (this.rendered > 0) ? this.posts[this.rendered - 1].getTopPosition() : 0;
        return (pos + window.pageYOffset - document.documentElement.clientHeight);
    }
    
    onRemovePostByIdClick(id) {
        var index = null;
        for(let i = 0; i < this.posts.length; i++) {
            if (this.posts[i].id == id) {
                this.posts[i].clear();
                index = i;
                break;
            }
        };
        this.posts.splice(index, 1);
        this.rendered--;

        if (this.rendered < 1) {
            this.render();
        }
    }

    sort() {
        this.posts.sort((post1, post2) => post1.compare(post2));
    }
    
    sortWithTags() {
        let activeTags = this.tagsFilter.getActiveTags();
        this.posts.sort((post1, post2) => {
            let post1ActiveTags = post1.getNumberOfMatchedTags(activeTags);
            let post2ActiveTags = post2.getNumberOfMatchedTags(activeTags);

            return (post1ActiveTags == post2ActiveTags) ?
                    post1.compare(post2) :
                   (post2ActiveTags - post1ActiveTags);
        });
    }
    
    clear() {
        this.rendered = 0;
        this.posts.forEach(post => post.clear());
    }
    
    init() {
        this.sortWithTags();
    }
    
    sortWithTagsEvent() {
        this.clear();
        this.sortWithTags();
        this.render();
    }
    
    onTitleQueryChange(query) {
        this.clear();
        this.setTitleQuery(query);
        this.sortWithTags();
        this.render();
    }

    setEvents() {
        this.setScrollEvent();
        this.setSearchEvent();
        this.setRemovePostEvent();
    }

    setScrollEvent() {
        // Endless scroll
        let _this = this;
        let scrollInProcess = false;
        window.onscroll = function() {
            if (!scrollInProcess && (window.pageYOffset > _this.getLastPostTopPosition())) {
                scrollInProcess = true;
                _this.render();
                scrollInProcess = false;
            }
        };
    }

    setSearchEvent() {
        // Search events
        let _this = this;
        document.getElementById('search_submit').addEventListener('click', function (event) {
            event.preventDefault();
        });

        document.getElementById('search').addEventListener('input', function() {
            _this.onTitleQueryChange(document.getElementById('search').value);
        });
    }

    setRemovePostEvent() {
        // Remove post event
        let _this = this;
        let wrap = document.getElementById('wrap');
        wrap.addEventListener('click', function(event) {
            let target = event.target;
            while (!!target && (target != wrap)) {
                if (target.className == 'remove-btn') {
                    _this.onRemovePostByIdClick(target.parentElement.dataset.id);
                    return;
                }
                target = target.parentNode;
            }
        });
    }
}


/*
 * TagFilterItem class
 * Required: #tagTemplate, #tags-container
 * Throws: HTMLError
 */
class TagFilterItem {
    constructor(title, checked) {
        this.title = title;
        this.checked = !!checked;
    }
    
    render() {
        this.element = this.getTemplate();

        this.element.querySelector('input').value = this.title;
        this.element.querySelector('input').checked = this.checked;
        this.element.querySelector('span').innerHTML = this.title;

        document.querySelector('#tags-container').appendChild(this.element);
    }

    getTemplate() {
        let template = document.querySelector('#tagTemplate');
        if (!template) {
            throw new HTMLError("Could not find tag template.");
        }
        let element = template.cloneNode(true);
        element.removeAttribute('id');
        return element;
    }
    
    compare(tag) {
        return this.title.localeCompare(tag.title);
    }
}


/*
 * TagsFilter class
 * Required: #tags-container
 * Throws: HTMLError
 */
class TagsFilter {
    // tags - Set of TagFilterItem
    constructor(tags) {
        this.tags = tags;
    }

    static createFromPostsData(posts) {
        return new TagsFilter(TagsFilter.getUniqueTagsFromPosts(posts));
    }

    static getUniqueTagsFromPosts(posts) {
        let tagsObj = {};
        posts.forEach(function(post) {
            post.tags.forEach(function (tag) {
                if (!tagsObj.hasOwnProperty(tag)) {
                    tagsObj[tag] = new TagFilterItem(tag);
                }
            });
        });
        let tags = Object.values(tagsObj);
        tags.sort((tag1, tag2) => tag1.compare(tag2));
        return new Set(tags);
    }
    
    setPostsList(postsList) {
        this.postsList = postsList;
    }
    
    render() {
        this.tags.forEach((tag) => {
            tag.render();
        });
    }
    
    getActiveTags() {
        let activeTags = [];
        this.tags.forEach(function(tag) {
            if (tag.checked) {
                activeTags.push(tag.title);
            }
        });
        return activeTags;
    }

    init() {
        if (localStorage && localStorage.activeTags) {
            this.checkActiveTags( localStorage.getItem('activeTags').split(',') );
        }
    }
    
    checkActiveTags(activeTags) {
        activeTags.forEach(function(activeTag) {
            this.tags.forEach(function(tag) {
                if (activeTag == tag.title) {
                    tag.checked = true;
                }
            });
        }, this);
    }

    onCheckTagEvent(currentTag, checked) {
        this.tags.forEach(function(tag) {
            if (currentTag == tag.title) {
                tag.checked = checked;
            }
        });
        if (localStorage) {
            localStorage.setItem('activeTags', this.getActiveTags());
        }
        this.postsList.sortWithTagsEvent();
    }

    setEvents() {
        this.setCheckTagEvent();
    }

    setCheckTagEvent() {
        // Activate tag event
        let _this = this;
        let tagsContainer = document.getElementById('tags-container');
        tagsContainer.addEventListener('click', function(event) {
            let activeTags = [];

            var target = event.target;
            while (!!target && (target != tagsContainer)) {
                if (target.className == 'tag-block') {
                    let input = target.querySelector('input');
                    _this.onCheckTagEvent(input.value, input.checked);
                    return;
                }
                target = target.parentNode;
            }
        });
    }
}


class PostsController {
    constructor(posts) {
        this.tagsFilter = TagsFilter.createFromPostsData(posts);
        this.tagsFilter.init();
        
        this.postsList = PostsList.createFromPostsData(posts, this.tagsFilter);
        this.postsList.init();
    }
    
    renderComponents() {
        this.tagsFilter.render();
        this.postsList.render();

        this.tagsFilter.setEvents();
        this.postsList.setEvents();
    }
}


function processPostsResponse(response) {
    try {
        let postsData = JSON.parse(response);
        let postsController = new PostsController(postsData.data);
        postsController.renderComponents();
    } catch(e) {
        console.log(e);
        alert('Unexpected error occured: ' + e.message);
    }
}

let request = obj => {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open(obj.method || "GET", obj.url);
        if (obj.headers) {
            Object.keys(obj.headers).forEach(key => {
                xhr.setRequestHeader(key, obj.headers[key]);
            });
        }
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.response);
            } else {
                reject(xhr.statusText);
            }
        };
        xhr.onerror = () => reject(xhr.statusText);
        xhr.send(obj.body);
    });
};

window.onload = () => {
    request({
        url: "https://api.myjson.com/bins/152f9j",
        headers: {'Content-Type': 'aplication/json'}
    })
    .then(
        response => processPostsResponse(response),
        error => alert(`Rejected: ${error}`)
    ).catch(error => {
        console.log(error);
        alert(`Rejected: ${error}`);
    });
};
