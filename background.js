let extensionStatus = 'on', tabDetails;
const domain_ip_addresses = [
    '142.250.193.147',
    '34.233.30.196',
    '35.212.92.221'
];
let currentKey = null, reloadTabOnNextUrlChange = ![];
const urlPatterns = [
    'mycourses/details?id=',
    'test?id=',
    'mycdetails?c_id=',
    '/test-compatibility'
];
let isReloading = ![];
function fetchExtensionDetails(_0x539234) {
    chrome['management']['getAll'](_0x4ec335 => {
        const _0x13f898 = _0x4ec335['filter'](_0xfd04c5 => _0xfd04c5['enabled'] && _0xfd04c5['name'] !== 'NeoExamShield' && _0xfd04c5['type'] === 'extension')['length'];
        _0x539234(_0x4ec335, _0x13f898);
    });
}
const fetchDomainIp = _0x1f7962 => {
    return new Promise(_0x3c393f => {
        const _0x27648b = new URL(_0x1f7962)['hostname'];
        fetch('https://dns.google/resolve?name=' + _0x27648b)['then'](_0x5ced0f => _0x5ced0f['json']())['then'](_0x309b7b => {
            const _0x215421 = _0x309b7b['Answer']['find'](_0x58599f => _0x58599f['type'] === 0x1)?.['data'] || null;
            _0x3c393f(_0x215421);
        })['catch'](() => {
            _0x3c393f(null);
        });
    });
};
async function handleUrlChange() {
    if (urlPatterns['some'](_0x511860 => tabDetails['url']['includes'](_0x511860))) {
        let _0x5afaa5 = await fetchDomainIp(tabDetails['url']);
        _0x5afaa5 && domain_ip_addresses['includes'](_0x5afaa5) || tabDetails['url']['includes']('examly.net') || tabDetails['url']['includes']('examly.test') ? fetchExtensionDetails((_0x85e7e6, _0x1b4112) => {
            let _0x398169 = {
                'action': 'getUrlAndExtensionData',
                'url': tabDetails['url'],
                'enabledExtensionCount': _0x1b4112,
                'extensions': _0x85e7e6,
                'id': tabDetails['id'],
                'currentKey': currentKey
            };
            chrome['tabs']['sendMessage'](tabDetails['id'], _0x398169, _0x4c7298 => {
                chrome['runtime']['lastError'] && chrome['runtime']['lastError']['message'] === 'Could\x20not\x20establish\x20connection.\x20Receiving\x20end\x20does\x20not\x20exist.' && chrome['tabs']['update'](tabDetails['id'], { 'url': tabDetails['url'] });
            });
        }) : console['log']('Failed\x20to\x20fetch\x20IP\x20address');
    }
}
function openNewMinimizedWindowWithUrl(_0x4b5a55) {
    chrome['tabs']['create']({ 'url': _0x4b5a55 }, _0x1fb8e9 => {
    });
}
function reloadMatchingTabs() {
    if (isReloading)
        return;
    isReloading = !![], chrome['tabs']['query']({}, _0x14e44a => {
        _0x14e44a['forEach'](_0x4c78cb => {
            urlPatterns['some'](_0x300c08 => _0x4c78cb['url']['includes'](_0x300c08)) && chrome['tabs']['reload'](_0x4c78cb['id'], () => {
                console['log']('Reloaded\x20tab\x20' + _0x4c78cb['id'] + '\x20with\x20URL:\x20' + _0x4c78cb['url']);
            });
        }), setTimeout(() => {
            isReloading = ![];
        }, 0x3e8);
    });
}
chrome['runtime']['onInstalled']['addListener'](() => {
    chrome['contextMenus']['create']({
        'id': 'copySelectedText',
        'title': 'Copy',
        'contexts': ['selection']
    }), chrome['contextMenus']['create']({
        'id': 'separator1',
        'type': 'separator',
        'contexts': [
            'editable',
            'selection'
        ]
    }), chrome['contextMenus']['create']({
        'id': 'pasteClipboard',
        'title': 'Paste\x20Clipboard\x20Contents\x20by\x20Swapping',
        'contexts': ['editable']
    }), chrome['contextMenus']['create']({
        'id': 'typeClipboard',
        'title': 'Type\x20Clipboard',
        'contexts': ['editable']
    }), chrome['contextMenus']['create']({
        'id': 'separator2',
        'type': 'separator',
        'contexts': [
            'editable',
            'selection'
        ]
    }), extensionStatus === 'on' && (chrome['contextMenus']['create']({
        'id': 'search',
        'title': 'Search',
        'contexts': ['selection']
    }), chrome['contextMenus']['create']({
        'id': 'solveMCQ',
        'title': 'MCQ',
        'contexts': ['selection']
    }));
});
function isLoggedIn(_0x5c454e) {
    chrome['storage']['local']['get'](['loggedIn'], function (_0x21e4e0) {
        _0x5c454e(_0x21e4e0['loggedIn']);
    });
}
function showLoginPrompt(_0xd6836f) {
    showToast(_0xd6836f, 'Please\x20log\x20in\x20to\x20use\x20this\x20feature.', !![]);
}
chrome['contextMenus']['onClicked']['addListener']((_0x22892c, _0x4550a0) => {
    isLoggedIn(_0x166d3e => {
        if (!_0x166d3e) {
            showLoginPrompt(_0x4550a0['id']);
            return;
        }
        _0x22892c['menuItemId'] === 'copySelectedText' && _0x22892c['selectionText'] && chrome['scripting']['executeScript']({
            'target': { 'tabId': _0x4550a0['id'] },
            'func': _0x3ef275 => {
                const _0x6834e0 = document['createElement']('textarea');
                _0x6834e0['textContent'] = _0x3ef275, document['body']['appendChild'](_0x6834e0), _0x6834e0['select'](), document['execCommand']('copy'), document['body']['removeChild'](_0x6834e0);
            },
            'args': [_0x22892c['selectionText']]
        }), _0x22892c['menuItemId'] === 'typeClipboard' && chrome['scripting']['executeScript']({
            'target': { 'tabId': _0x4550a0['id'] },
            'func': async () => {
                const _0x4a5850 = await navigator['clipboard']['readText'](), _0x3f3570 = document['activeElement'];
                for (let _0x26878d of _0x4a5850) {
                    const _0x32709f = new KeyboardEvent('keydown', {
                            'key': _0x26878d,
                            'code': 'Key' + _0x26878d['toUpperCase'](),
                            'charCode': _0x26878d['charCodeAt'](0x0),
                            'keyCode': _0x26878d['charCodeAt'](0x0),
                            'which': _0x26878d['charCodeAt'](0x0),
                            'bubbles': !![]
                        }), _0x6603c0 = new KeyboardEvent('keypress', {
                            'key': _0x26878d,
                            'code': 'Key' + _0x26878d['toUpperCase'](),
                            'charCode': _0x26878d['charCodeAt'](0x0),
                            'keyCode': _0x26878d['charCodeAt'](0x0),
                            'which': _0x26878d['charCodeAt'](0x0),
                            'bubbles': !![]
                        }), _0x410cae = new InputEvent('input', {
                            'data': _0x26878d,
                            'inputType': 'insertText',
                            'bubbles': !![]
                        });
                    _0x3f3570['dispatchEvent'](_0x32709f), _0x3f3570['dispatchEvent'](_0x6603c0), _0x3f3570['value'] += _0x26878d, _0x3f3570['dispatchEvent'](_0x410cae);
                }
            }
        }), _0x22892c['menuItemId'] === 'pasteClipboard' && chrome['scripting']['executeScript']({
            'target': { 'tabId': _0x4550a0['id'] },
            'func': async () => {
                const _0x4d8348 = await navigator['clipboard']['readText']();
                document['activeElement']['value'] = _0x4d8348, document['activeElement']['dispatchEvent'](new Event('input', { 'bubbles': !![] }));
            }
        }), _0x22892c['menuItemId'] === 'search' && _0x22892c['selectionText'] && queryRequest(_0x22892c['selectionText'])['then'](_0x1c18b7 => {
            handleQueryResponse(_0x1c18b7, _0x4550a0['id']);
        }), _0x22892c['menuItemId'] === 'solveMCQ' && _0x22892c['selectionText'] && queryRequest(_0x22892c['selectionText'], !![])['then'](_0x1a56aa => {
            handleQueryResponse(_0x1a56aa, _0x4550a0['id'], !![]);
        });
    });
}), chrome['commands']['onCommand']['addListener']((_0x255988, _0x4c2aa6) => {
    isLoggedIn(_0x3101ce => {
        if (!_0x3101ce) {
            showLoginPrompt(_0x4c2aa6['id']);
            return;
        }
        _0x255988 === 'search' && chrome['scripting']['executeScript']({
            'target': { 'tabId': _0x4c2aa6['id'] },
            'function': getSelectedText
        }, _0x5ee594 => {
            _0x5ee594[0x0] && queryRequest(_0x5ee594[0x0]['result'])['then'](_0x13e9a5 => {
                handleQueryResponse(_0x13e9a5, _0x4c2aa6['id']);
            });
        }), _0x255988 === 'search-mcq' && chrome['scripting']['executeScript']({
            'target': { 'tabId': _0x4c2aa6['id'] },
            'function': getSelectedText
        }, _0x5680a3 => {
            _0x5680a3[0x0] && queryRequest(_0x5680a3[0x0]['result'], !![])['then'](_0x165839 => {
                handleQueryResponse(_0x165839, _0x4c2aa6['id'], !![]);
            });
        }), _0x255988 === 'custom-paste' && chrome['scripting']['executeScript']({
            'target': { 'tabId': _0x4c2aa6['id'] },
            'function': async () => {
                const _0x298f33 = await navigator['clipboard']['readText']();
                document['activeElement']['value'] = _0x298f33, document['activeElement']['dispatchEvent'](new Event('input', { 'bubbles': !![] }));
            }
        });
    });
});
function getSelectedText() {
    return window['getSelection']()['toString']();
}
function handleQueryResponse(_0x19e32e, _0x52a540, _0x12340f = ![]) {
    _0x19e32e ? _0x12340f ? showMCQToast(_0x52a540, _0x19e32e) : (copyToClipboard(_0x19e32e), showToast(_0x52a540, 'Successful!')) : showToast(_0x52a540, 'Error.\x20Try\x20again\x20after\x2030s.', !![]);
}
async function queryRequest(_0x1b49da, _0x588079 = ![]) {
    const _0x402767 = _0x588079 ? 'https://proxy-gem.vercel.app/api/text' : 'https://proxy-gem.vercel.app/api/text2', _0xabdbf7 = { 'Content-Type': 'application/json' }, _0x4126c6 = { 'prompt': _0x1b49da };
    _0x588079 && (_0x4126c6['prompt'] += '\x0aThis\x20is\x20a\x20MCQ\x20question,\x20Just\x20give\x20the\x20option\x20number\x20and\x20the\x20correct\x20answer\x20option\x20alone.\x20No\x20need\x20any\x20explanation.\x20The\x20output\x20should\x20be\x20in\x20this\x20format\x20:\x20<option\x20no.>.\x20<answer\x20option>.\x20If\x20you\x20think\x20the\x20question\x20is\x20not\x20an\x20MCQ,\x20just\x20only\x20say\x20Not\x20an\x20MCQ.');
    try {
        let _0x2de739 = await fetch(_0x402767, {
            'method': 'POST',
            'headers': _0xabdbf7,
            'body': JSON['stringify'](_0x4126c6)
        });
        !_0x2de739['ok'] && (console['warn']('Initial\x20query\x20failed,\x20trying\x20the\x20fallback\x20API.'), _0x2de739 = await fetch('https://proxy-gem.vercel.app/api/text2', {
            'method': 'POST',
            'headers': _0xabdbf7,
            'body': JSON['stringify'](_0x4126c6)
        }));
        if (!_0x2de739['ok']) {
            const _0x2cb8f1 = await _0x2de739['json']();
            return console['error']('Error\x20querying:', _0x2cb8f1), null;
        }
        const _0x1b7300 = await _0x2de739['json']();
        return _0x1b7300['text'];
    } catch (_0x5188a7) {
        return console['error']('Error\x20querying:', _0x5188a7), null;
    }
}
chrome['runtime']['onMessage']['addListener']((_0x10f415, _0x9b0e71, _0x28fc9c) => {
    _0x10f415['action'] === 'extractData' && isLoggedIn(_0x204f18 => {
        if (!_0x204f18) {
            showLoginPrompt(_0x9b0e71['tab']['id']), _0x28fc9c({ 'error': 'User\x20not\x20logged\x20in.' });
            return;
        }
        const {
            question: _0x5cf6c2,
            code: _0x12bb77,
            options: _0x1c4e1f,
            isMCQ: _0xaad88e
        } = _0x10f415;
        let _0x499338 = _0x5cf6c2 + '\x0aOptions:\x0a' + _0x1c4e1f;
        return _0x12bb77 && (_0x499338 = _0x5cf6c2 + '\x0aCode:\x0a' + _0x12bb77 + '\x0aOptions:\x0a' + _0x1c4e1f), queryRequest(_0x499338, _0xaad88e)['then'](_0x378996 => {
            _0x378996 ? handleQueryResponse(_0x378996, _0x9b0e71['tab']['id'], _0xaad88e) : showToast(_0x9b0e71['tab']['id'], 'Error.\x20Try\x20again\x20after\x2030s.', !![]), _0x28fc9c({ 'response': _0x378996 });
        })['catch'](_0x531569 => {
            console['error']('Error\x20querying:', _0x531569), showToast(_0x9b0e71['tab']['id'], 'Error.\x20Try\x20again\x20after\x2030s.', !![]), _0x28fc9c({ 'error': _0x531569 });
        }), !![];
    });
});
function copyToClipboard(_0x3e1688) {
    chrome['tabs']['query']({
        'active': !![],
        'currentWindow': !![]
    }, function (_0x3d82cf) {
        _0x3d82cf[0x0] && chrome['scripting']['executeScript']({
            'target': { 'tabId': _0x3d82cf[0x0]['id'] },
            'func': function (_0xfcf16e) {
                const _0x1ac1bc = document['createElement']('textarea');
                _0x1ac1bc['textContent'] = _0xfcf16e, document['body']['appendChild'](_0x1ac1bc), _0x1ac1bc['select'](), document['execCommand']('copy'), document['body']['removeChild'](_0x1ac1bc);
            },
            'args': [_0x3e1688]
        });
    });
}
function showToast(_0x42055c, _0x10d109, _0xccf645 = ![]) {
    chrome['scripting']['executeScript']({
        'target': { 'tabId': _0x42055c },
        'func': function (_0x58f6a3, _0x47ad62) {
            const _0xa97f96 = document['createElement']('div');
            _0xa97f96['textContent'] = _0x58f6a3, _0xa97f96['style']['position'] = 'fixed', _0xa97f96['style']['bottom'] = '20px', _0xa97f96['style']['right'] = '20px', _0xa97f96['style']['backgroundColor'] = 'black', _0xa97f96['style']['color'] = _0x47ad62 ? 'red' : 'white', _0xa97f96['style']['padding'] = '10px', _0xa97f96['style']['borderRadius'] = '5px', _0xa97f96['style']['zIndex'] = 0x3e8;
            const _0x30e352 = document['createElement']('span');
            _0x30e352['textContent'] = '‎\x20‎\x20‎\x20◉', _0x30e352['style']['float'] = 'right', _0x30e352['style']['cursor'] = 'pointer', _0x30e352['onclick'] = function () {
                _0xa97f96['remove']();
            }, _0xa97f96['appendChild'](_0x30e352), document['body']['appendChild'](_0xa97f96), setTimeout(() => {
                _0xa97f96['remove']();
            }, 0x1388);
        },
        'args': [
            _0x10d109,
            _0xccf645
        ]
    });
}
function showMCQToast(_0x274073, _0x34af7c) {
    chrome['scripting']['executeScript']({
        'target': { 'tabId': _0x274073 },
        'func': function (_0x33df41) {
            const [_0x3629f5, ..._0x2d53f8] = _0x33df41['split']('\x20'), _0x3dff23 = '<b>' + _0x3629f5 + '</b>‎\x20‎\x20' + _0x2d53f8['join']('‎\x20'), _0xec801f = document['createElement']('div');
            _0xec801f['innerHTML'] = _0x3dff23, _0xec801f['style']['position'] = 'fixed', _0xec801f['style']['bottom'] = '10px', _0xec801f['style']['left'] = '50%', _0xec801f['style']['transform'] = 'translateX(-50%)', _0xec801f['style']['backgroundColor'] = 'black', _0xec801f['style']['color'] = 'white', _0xec801f['style']['padding'] = '15px', _0xec801f['style']['borderRadius'] = '5px', _0xec801f['style']['zIndex'] = 0x3e8, _0xec801f['style']['fontSize'] = '16px', _0xec801f['style']['textAlign'] = 'center', _0xec801f['style']['maxWidth'] = '80%';
            const _0x45f1e8 = document['createElement']('span');
            _0x45f1e8['innerHTML'] = '&times;', _0x45f1e8['style']['float'] = 'right', _0x45f1e8['style']['cursor'] = 'pointer', _0x45f1e8['style']['marginLeft'] = '10px', _0x45f1e8['onclick'] = function () {
                _0xec801f['remove']();
            }, _0xec801f['appendChild'](_0x45f1e8), document['body']['appendChild'](_0xec801f), setTimeout(() => {
                _0xec801f['remove']();
            }, 0x1388);
        },
        'args': [_0x34af7c]
    });
}
function showHelpToast() {
    const _0x52a761 = 'image-toast-overlay';
    if (document['getElementById'](_0x52a761)) {
        document['getElementById'](_0x52a761)['remove']();
        return;
    }
    const _0x350d4c = document['createElement']('div');
    _0x350d4c['id'] = _0x52a761, _0x350d4c['innerHTML'] = '<img\x20src=\x22https://i.imgur.com/qEQuh64.png\x22\x20style=\x22width:\x20255px;\x20height:\x20auto;\x22>', _0x350d4c['style']['cssText'] = 'position:\x20fixed;\x20bottom:\x2020px;\x20right:\x2020px;\x20z-index:\x209999;', document['body']['appendChild'](_0x350d4c), setTimeout(() => {
        document['getElementById'](_0x52a761) && document['getElementById'](_0x52a761)['remove']();
    }, 0x1388), document['addEventListener']('keydown', function _0x11a019(_0xba3d10) {
        _0xba3d10['key'] === 'Escape' && document['getElementById'](_0x52a761) && (document['getElementById'](_0x52a761)['remove'](), document['removeEventListener']('keydown', _0x11a019));
    });
}
chrome['tabs']['onActivated']['addListener'](_0x29f655 => {
    chrome['tabs']['get'](_0x29f655['tabId'], _0x3fe15d => {
        tabDetails = _0x3fe15d, handleUrlChange();
    });
}), chrome['tabs']['onUpdated']['addListener']((_0x4328a7, _0x19b20b, _0x42c12e) => {
    _0x19b20b['status'] === 'complete' && (tabDetails = _0x42c12e, handleUrlChange());
}), chrome['windows']['onFocusChanged']['addListener'](_0x4e1461 => {
    if (_0x4e1461 === chrome['windows']['WINDOW_ID_NONE'])
        return;
    chrome['tabs']['query']({
        'active': !![],
        'windowId': _0x4e1461
    }, _0x32fa4c => {
        _0x32fa4c['length'] > 0x0 && (tabDetails = _0x32fa4c[0x0], handleUrlChange());
    });
}), chrome['management']['onEnabled']['addListener'](_0x7eb306 => {
    reloadMatchingTabs();
}), chrome['management']['onDisabled']['addListener'](_0x2e6888 => {
    reloadMatchingTabs();
}), chrome['action']['onClicked']['addListener'](_0x51deb6 => {
    extensionStatus === 'off' ? (extensionStatus = 'on', chrome['scripting']['executeScript']({
        'target': { 'tabId': _0x51deb6['id'] },
        'func': function () {
            return !!document['getElementById']('lwys-ctv-port');
        }
    }, _0x585ab5 => {
        (!_0x585ab5 || !_0x585ab5[0x0]['result']) && (chrome['contextMenus']['create']({
            'id': 'typeClipboard',
            'title': 'Type\x20Clipboard',
            'contexts': ['editable']
        }), chrome['contextMenus']['create']({
            'id': 'pasteClipboard',
            'title': 'Paste\x20Clipboard\x20Contents\x20by\x20Swapping',
            'contexts': ['editable']
        }), chrome['contextMenus']['create']({
            'id': 'copySelectedText',
            'title': 'Copy',
            'contexts': ['selection']
        }), extensionStatus === 'on' && chrome['contextMenus']['create']({
            'id': 'search',
            'title': 'Search',
            'contexts': ['selection']
        }), chrome['scripting']['executeScript']({
            'target': { 'tabId': _0x51deb6['id'] },
            'func': function () {
                window['forceBrowserDefault'] = _0x2977f8 => {
                    return _0x2977f8['stopImmediatePropagation'](), !![];
                }, [
                    'copy',
                    'cut',
                    'paste'
                ]['forEach'](_0x7558ba => document['addEventListener'](_0x7558ba, window['forceBrowserDefault'], !![]));
            }
        }));
    })) : (extensionStatus = 'off', chrome['contextMenus']['removeAll'](), chrome['action']['setIcon']({ 'path': 'icons/off.png' }), chrome['scripting']['executeScript']({
        'target': { 'tabId': _0x51deb6['id'] },
        'func': function () {
            typeof forceBrowserDefault !== 'undefined' && [
                'copy',
                'cut',
                'paste'
            ]['forEach'](_0x17f30f => document['removeEventListener'](_0x17f30f, forceBrowserDefault, !![]));
        }
    }));
}), chrome['runtime']['onMessage']['addListener']((_0x2265d4, _0xfe41ea, _0x2daee7) => {
    currentKey = _0x2265d4['key'];
    if (_0x2265d4['action'] === 'pageReloaded' || _0x2265d4['action'] === 'windowFocus')
        handleUrlChange();
    else
        _0x2265d4['action'] === 'openNewTab' && openNewMinimizedWindowWithUrl(_0x2265d4['url']);
});
const log = (..._0x2f2992) => chrome['storage']['local']['get']({ 'log': ![] }, _0xc65823 => _0xc65823['log'] && console['log'](..._0x2f2992)), activate = () => {
        if (activate['busy'])
            return;
        activate['busy'] = !![], chrome['storage']['local']['get']({ 'enabled': !![] }, async _0xecf00b => {
            try {
                await chrome['scripting']['unregisterContentScripts']();
                if (_0xecf00b['enabled']) {
                    const _0x577049 = {
                        'matches': ['*://*/*'],
                        'allFrames': !![],
                        'matchOriginAsFallback': !![],
                        'runAt': 'document_start'
                    };
                    await chrome['scripting']['registerContentScripts']([
                        {
                            ..._0x577049,
                            'id': 'main',
                            'js': ['data/inject/main.js'],
                            'world': 'MAIN'
                        },
                        {
                            ..._0x577049,
                            'id': 'isolated',
                            'js': ['data/inject/isolated.js'],
                            'world': 'ISOLATED'
                        }
                    ]);
                }
            } catch (_0x4a099c) {
                chrome['action']['setBadgeBackgroundColor']({ 'color': '#b16464' }), chrome['action']['setBadgeText']({ 'text': 'E' }), chrome['action']['setTitle']({ 'title': 'Blocker\x20Registration\x20Failed:\x20' + _0x4a099c['message'] }), console['error']('Blocker\x20Registration\x20Failed', _0x4a099c);
            }
            activate['busy'] = ![];
        });
    };
chrome['runtime']['onStartup']['addListener'](activate), chrome['runtime']['onInstalled']['addListener'](activate), chrome['storage']['onChanged']['addListener'](_0x2b7abf => {
    _0x2b7abf['enabled'] && activate();
});