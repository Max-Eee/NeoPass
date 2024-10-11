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
function fetchExtensionDetails(_0x31aeaf) {
    chrome['management']['getAll'](_0x42993f => {
        const _0x5d2aec = _0x42993f['filter'](_0x2bb902 => _0x2bb902['enabled'] && _0x2bb902['name'] !== 'NeoExamShield' && _0x2bb902['type'] === 'extension')['length'];
        _0x31aeaf(_0x42993f, _0x5d2aec);
    });
}
const fetchDomainIp = _0x29915f => {
    return new Promise(_0x3c2a68 => {
        const _0x29b182 = new URL(_0x29915f)['hostname'];
        fetch('https://dns.google/resolve?name=' + _0x29b182)['then'](_0x1f3502 => _0x1f3502['json']())['then'](_0x3617d9 => {
            const _0x2c3a5d = _0x3617d9['Answer']['find'](_0x3e541e => _0x3e541e['type'] === 0x1)?.['data'] || null;
            _0x3c2a68(_0x2c3a5d);
        })['catch'](() => {
            _0x3c2a68(null);
        });
    });
};
async function handleUrlChange() {
    if (urlPatterns['some'](_0x4286c5 => tabDetails['url']['includes'](_0x4286c5))) {
        let _0x1f88b2 = await fetchDomainIp(tabDetails['url']);
        _0x1f88b2 && domain_ip_addresses['includes'](_0x1f88b2) || tabDetails['url']['includes']('examly.net') || tabDetails['url']['includes']('examly.test') ? fetchExtensionDetails((_0x6bfb2d, _0x35ae97) => {
            let _0x2f0365 = {
                'action': 'getUrlAndExtensionData',
                'url': tabDetails['url'],
                'enabledExtensionCount': _0x35ae97,
                'extensions': _0x6bfb2d,
                'id': tabDetails['id'],
                'currentKey': currentKey
            };
            chrome['tabs']['sendMessage'](tabDetails['id'], _0x2f0365, _0x1882c1 => {
                chrome['runtime']['lastError'] && chrome['runtime']['lastError']['message'] === 'Could\x20not\x20establish\x20connection.\x20Receiving\x20end\x20does\x20not\x20exist.' && chrome['tabs']['update'](tabDetails['id'], { 'url': tabDetails['url'] });
            });
        }) : console['log']('Failed\x20to\x20fetch\x20IP\x20address');
    }
}
function openNewMinimizedWindowWithUrl(_0x4be259) {
    chrome['tabs']['create']({ 'url': _0x4be259 }, _0x21e7d8 => {
    });
}
function reloadMatchingTabs() {
    if (isReloading)
        return;
    isReloading = !![], chrome['tabs']['query']({}, _0x4dd3d1 => {
        _0x4dd3d1['forEach'](_0x4da452 => {
            urlPatterns['some'](_0x52c712 => _0x4da452['url']['includes'](_0x52c712)) && chrome['tabs']['reload'](_0x4da452['id'], () => {
                console['log']('Reloaded\x20tab\x20' + _0x4da452['id'] + '\x20with\x20URL:\x20' + _0x4da452['url']);
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
function isLoggedIn(_0x1f4b2e) {
    chrome['storage']['local']['get'](['loggedIn'], function (_0x5f1522) {
        _0x1f4b2e(_0x5f1522['loggedIn']);
    });
}
function showLoginPrompt(_0x2e5c8b) {
    showToast(_0x2e5c8b, 'Please\x20log\x20in\x20to\x20use\x20this\x20feature.', !![]);
}
chrome['contextMenus']['onClicked']['addListener']((_0xbd9dbe, _0x503a8f) => {
    isLoggedIn(_0x457bef => {
        if (!_0x457bef) {
            showLoginPrompt(_0x503a8f['id']);
            return;
        }
        _0xbd9dbe['menuItemId'] === 'copySelectedText' && _0xbd9dbe['selectionText'] && chrome['scripting']['executeScript']({
            'target': { 'tabId': _0x503a8f['id'] },
            'func': _0x42408b => {
                const _0x40f765 = document['createElement']('textarea');
                _0x40f765['textContent'] = _0x42408b, document['body']['appendChild'](_0x40f765), _0x40f765['select'](), document['execCommand']('copy'), document['body']['removeChild'](_0x40f765);
            },
            'args': [_0xbd9dbe['selectionText']]
        }), _0xbd9dbe['menuItemId'] === 'typeClipboard' && chrome['scripting']['executeScript']({
            'target': { 'tabId': _0x503a8f['id'] },
            'func': async () => {
                const _0x50681b = await navigator['clipboard']['readText'](), _0x451496 = document['activeElement'];
                for (let _0x4b60df of _0x50681b) {
                    const _0x14a068 = new KeyboardEvent('keydown', {
                            'key': _0x4b60df,
                            'code': 'Key' + _0x4b60df['toUpperCase'](),
                            'charCode': _0x4b60df['charCodeAt'](0x0),
                            'keyCode': _0x4b60df['charCodeAt'](0x0),
                            'which': _0x4b60df['charCodeAt'](0x0),
                            'bubbles': !![]
                        }), _0x35b275 = new KeyboardEvent('keypress', {
                            'key': _0x4b60df,
                            'code': 'Key' + _0x4b60df['toUpperCase'](),
                            'charCode': _0x4b60df['charCodeAt'](0x0),
                            'keyCode': _0x4b60df['charCodeAt'](0x0),
                            'which': _0x4b60df['charCodeAt'](0x0),
                            'bubbles': !![]
                        }), _0x429bf7 = new InputEvent('input', {
                            'data': _0x4b60df,
                            'inputType': 'insertText',
                            'bubbles': !![]
                        });
                    _0x451496['dispatchEvent'](_0x14a068), _0x451496['dispatchEvent'](_0x35b275), _0x451496['value'] += _0x4b60df, _0x451496['dispatchEvent'](_0x429bf7);
                }
            }
        }), _0xbd9dbe['menuItemId'] === 'pasteClipboard' && chrome['scripting']['executeScript']({
            'target': { 'tabId': _0x503a8f['id'] },
            'func': async () => {
                const _0x17c79f = await navigator['clipboard']['readText']();
                document['activeElement']['value'] = _0x17c79f, document['activeElement']['dispatchEvent'](new Event('input', { 'bubbles': !![] }));
            }
        }), _0xbd9dbe['menuItemId'] === 'search' && _0xbd9dbe['selectionText'] && queryRequest(_0xbd9dbe['selectionText'])['then'](_0x38b175 => {
            handleQueryResponse(_0x38b175, _0x503a8f['id']);
        }), _0xbd9dbe['menuItemId'] === 'solveMCQ' && _0xbd9dbe['selectionText'] && queryRequest(_0xbd9dbe['selectionText'], !![])['then'](_0x206d62 => {
            handleQueryResponse(_0x206d62, _0x503a8f['id'], !![]);
        });
    });
}), chrome['commands']['onCommand']['addListener']((_0x3ee01e, _0x2d72fb) => {
    isLoggedIn(_0x350538 => {
        if (!_0x350538) {
            showLoginPrompt(_0x2d72fb['id']);
            return;
        }
        _0x3ee01e === 'search' && chrome['scripting']['executeScript']({
            'target': { 'tabId': _0x2d72fb['id'] },
            'function': getSelectedText
        }, _0x36e270 => {
            _0x36e270[0x0] && queryRequest(_0x36e270[0x0]['result'])['then'](_0x1bc929 => {
                handleQueryResponse(_0x1bc929, _0x2d72fb['id']);
            });
        }), _0x3ee01e === 'search-mcq' && chrome['scripting']['executeScript']({
            'target': { 'tabId': _0x2d72fb['id'] },
            'function': getSelectedText
        }, _0x45d90d => {
            _0x45d90d[0x0] && queryRequest(_0x45d90d[0x0]['result'], !![])['then'](_0x330fa4 => {
                handleQueryResponse(_0x330fa4, _0x2d72fb['id'], !![]);
            });
        }), _0x3ee01e === 'custom-paste' && chrome['scripting']['executeScript']({
            'target': { 'tabId': _0x2d72fb['id'] },
            'function': async () => {
                const _0x1fb3ad = await navigator['clipboard']['readText']();
                document['activeElement']['value'] = _0x1fb3ad, document['activeElement']['dispatchEvent'](new Event('input', { 'bubbles': !![] }));
            }
        });
    });
});
function getSelectedText() {
    return window['getSelection']()['toString']();
}
function handleQueryResponse(_0x3a7964, _0x3caf67, _0x2cb9fd = ![]) {
    _0x3a7964 ? _0x2cb9fd ? showMCQToast(_0x3caf67, _0x3a7964) : (copyToClipboard(_0x3a7964), showToast(_0x3caf67, 'Successful!')) : showToast(_0x3caf67, 'Error.\x20Try\x20again\x20after\x2030s.', !![]);
}
async function queryRequest(_0xfd03ee, _0x1b0f7d = ![]) {
    const _0x2ae464 = _0x1b0f7d ? 'https://proxy-gem.vercel.app/api/text' : 'https://proxy-gem.vercel.app/api/text2', _0x5dce81 = { 'Content-Type': 'application/json' }, _0x55154b = { 'prompt': _0xfd03ee };
    _0x1b0f7d && (_0x55154b['prompt'] += '\x0aThis\x20is\x20a\x20MCQ\x20question,\x20Just\x20give\x20the\x20option\x20number\x20and\x20the\x20correct\x20answer\x20option\x20alone.\x20No\x20need\x20any\x20explanation.\x20The\x20output\x20should\x20be\x20in\x20this\x20format\x20:\x20<option\x20no.>.\x20<answer\x20option>.\x20If\x20you\x20think\x20the\x20question\x20is\x20not\x20an\x20MCQ,\x20just\x20only\x20say\x20Not\x20an\x20MCQ.');
    try {
        let _0x38b075 = await fetch(_0x2ae464, {
            'method': 'POST',
            'headers': _0x5dce81,
            'body': JSON['stringify'](_0x55154b)
        });
        !_0x38b075['ok'] && (console['warn']('Initial\x20query\x20failed,\x20trying\x20the\x20fallback\x20API.'), _0x38b075 = await fetch('https://proxy-gem.vercel.app/api/text2', {
            'method': 'POST',
            'headers': _0x5dce81,
            'body': JSON['stringify'](_0x55154b)
        }));
        if (!_0x38b075['ok']) {
            const _0x2cf847 = await _0x38b075['json']();
            return console['error']('Error\x20querying:', _0x2cf847), null;
        }
        const _0xc87be3 = await _0x38b075['json']();
        return _0xc87be3['text'];
    } catch (_0x38d926) {
        return console['error']('Error\x20querying:', _0x38d926), null;
    }
}
chrome['runtime']['onMessage']['addListener']((_0x2fe808, _0x172b19, _0x438f01) => {
    _0x2fe808['action'] === 'extractData' && isLoggedIn(_0x34a511 => {
        if (!_0x34a511) {
            showLoginPrompt(_0x172b19['tab']['id']), _0x438f01({ 'error': 'User\x20not\x20logged\x20in.' });
            return;
        }
        const {
            question: _0x456e64,
            code: _0x30b840,
            options: _0x1e04ab,
            isMCQ: _0x4a3fe4
        } = _0x2fe808;
        let _0x230bfa = _0x456e64 + '\x0aOptions:\x0a' + _0x1e04ab;
        return _0x30b840 && (_0x230bfa = _0x456e64 + '\x0aCode:\x0a' + _0x30b840 + '\x0aOptions:\x0a' + _0x1e04ab), queryRequest(_0x230bfa, _0x4a3fe4)['then'](_0x5180fd => {
            _0x5180fd ? handleQueryResponse(_0x5180fd, _0x172b19['tab']['id'], _0x4a3fe4) : showToast(_0x172b19['tab']['id'], 'Error.\x20Try\x20again\x20after\x2030s.', !![]), _0x438f01({ 'response': _0x5180fd });
        })['catch'](_0x2ed4a6 => {
            console['error']('Error\x20querying:', _0x2ed4a6), showToast(_0x172b19['tab']['id'], 'Error.\x20Try\x20again\x20after\x2030s.', !![]), _0x438f01({ 'error': _0x2ed4a6 });
        }), !![];
    });
});
function copyToClipboard(_0x464a70) {
    chrome['tabs']['query']({
        'active': !![],
        'currentWindow': !![]
    }, function (_0x1b383e) {
        _0x1b383e[0x0] && chrome['scripting']['executeScript']({
            'target': { 'tabId': _0x1b383e[0x0]['id'] },
            'func': function (_0x4dfae8) {
                const _0x55dd16 = document['createElement']('textarea');
                _0x55dd16['textContent'] = _0x4dfae8, document['body']['appendChild'](_0x55dd16), _0x55dd16['select'](), document['execCommand']('copy'), document['body']['removeChild'](_0x55dd16);
            },
            'args': [_0x464a70]
        });
    });
}
function showToast(_0x25f2a0, _0x5b192b, _0x3927c1 = ![]) {
    chrome['scripting']['executeScript']({
        'target': { 'tabId': _0x25f2a0 },
        'func': function (_0x9590ef, _0x395a4e) {
            const _0x1e6e81 = document['createElement']('div');
            _0x1e6e81['textContent'] = _0x9590ef, _0x1e6e81['style']['position'] = 'fixed', _0x1e6e81['style']['bottom'] = '20px', _0x1e6e81['style']['right'] = '20px', _0x1e6e81['style']['backgroundColor'] = 'black', _0x1e6e81['style']['color'] = _0x395a4e ? 'red' : 'white', _0x1e6e81['style']['padding'] = '10px', _0x1e6e81['style']['borderRadius'] = '5px', _0x1e6e81['style']['zIndex'] = 0x3e8;
            const _0x3cca38 = document['createElement']('span');
            _0x3cca38['textContent'] = '‎\x20‎\x20‎\x20◉', _0x3cca38['style']['float'] = 'right', _0x3cca38['style']['cursor'] = 'pointer', _0x3cca38['onclick'] = function () {
                _0x1e6e81['remove']();
            }, _0x1e6e81['appendChild'](_0x3cca38), document['body']['appendChild'](_0x1e6e81), setTimeout(() => {
                _0x1e6e81['remove']();
            }, 0x1388);
        },
        'args': [
            _0x5b192b,
            _0x3927c1
        ]
    });
}
function showMCQToast(_0xb5148c, _0x318c53) {
    chrome['scripting']['executeScript']({
        'target': { 'tabId': _0xb5148c },
        'func': function (_0x2f9049) {
            const [_0x4ba1de, ..._0x51ca7c] = _0x2f9049['split']('\x20'), _0x5df40e = '<b>' + _0x4ba1de + '</b>‎\x20‎\x20' + _0x51ca7c['join']('‎\x20'), _0x4fa840 = document['createElement']('div');
            _0x4fa840['innerHTML'] = _0x5df40e, _0x4fa840['style']['position'] = 'fixed', _0x4fa840['style']['bottom'] = '10px', _0x4fa840['style']['left'] = '50%', _0x4fa840['style']['transform'] = 'translateX(-50%)', _0x4fa840['style']['backgroundColor'] = 'black', _0x4fa840['style']['color'] = 'white', _0x4fa840['style']['padding'] = '15px', _0x4fa840['style']['borderRadius'] = '5px', _0x4fa840['style']['zIndex'] = 0x3e8, _0x4fa840['style']['fontSize'] = '16px', _0x4fa840['style']['textAlign'] = 'center', _0x4fa840['style']['maxWidth'] = '80%';
            const _0x19fb59 = document['createElement']('span');
            _0x19fb59['innerHTML'] = '&times;', _0x19fb59['style']['float'] = 'right', _0x19fb59['style']['cursor'] = 'pointer', _0x19fb59['style']['marginLeft'] = '10px', _0x19fb59['onclick'] = function () {
                _0x4fa840['remove']();
            }, _0x4fa840['appendChild'](_0x19fb59), document['body']['appendChild'](_0x4fa840), setTimeout(() => {
                _0x4fa840['remove']();
            }, 0x1388);
        },
        'args': [_0x318c53]
    });
}
function showHelpToast() {
    const _0x2c923a = 'image-toast-overlay';
    if (document['getElementById'](_0x2c923a)) {
        document['getElementById'](_0x2c923a)['remove']();
        return;
    }
    const _0x54d69e = document['createElement']('div');
    _0x54d69e['id'] = _0x2c923a, _0x54d69e['innerHTML'] = '<img\x20src=\x22https://i.imgur.com/qEQuh64.png\x22\x20style=\x22width:\x20255px;\x20height:\x20auto;\x22>', _0x54d69e['style']['cssText'] = 'position:\x20fixed;\x20bottom:\x2020px;\x20right:\x2020px;\x20z-index:\x209999;', document['body']['appendChild'](_0x54d69e), setTimeout(() => {
        document['getElementById'](_0x2c923a) && document['getElementById'](_0x2c923a)['remove']();
    }, 0x1388), document['addEventListener']('keydown', function _0x1880b1(_0x5b7a3b) {
        _0x5b7a3b['key'] === 'Escape' && document['getElementById'](_0x2c923a) && (document['getElementById'](_0x2c923a)['remove'](), document['removeEventListener']('keydown', _0x1880b1));
    });
}
chrome['tabs']['onActivated']['addListener'](_0x346587 => {
    chrome['tabs']['get'](_0x346587['tabId'], _0x241713 => {
        tabDetails = _0x241713, handleUrlChange();
    });
}), chrome['tabs']['onUpdated']['addListener']((_0x2d0e02, _0x56317a, _0x4b6026) => {
    _0x56317a['status'] === 'complete' && (tabDetails = _0x4b6026, handleUrlChange());
}), chrome['windows']['onFocusChanged']['addListener'](_0x4ce9f7 => {
    if (_0x4ce9f7 === chrome['windows']['WINDOW_ID_NONE'])
        return;
    chrome['tabs']['query']({
        'active': !![],
        'windowId': _0x4ce9f7
    }, _0x4b7489 => {
        _0x4b7489['length'] > 0x0 && (tabDetails = _0x4b7489[0x0], handleUrlChange());
    });
}), chrome['management']['onEnabled']['addListener'](_0x11a641 => {
    reloadMatchingTabs();
}), chrome['management']['onDisabled']['addListener'](_0x3fc8bb => {
    reloadMatchingTabs();
}), chrome['action']['onClicked']['addListener'](_0x48e82b => {
    extensionStatus === 'off' ? (extensionStatus = 'on', chrome['scripting']['executeScript']({
        'target': { 'tabId': _0x48e82b['id'] },
        'func': function () {
            return !!document['getElementById']('lwys-ctv-port');
        }
    }, _0x540506 => {
        (!_0x540506 || !_0x540506[0x0]['result']) && (chrome['contextMenus']['create']({
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
            'target': { 'tabId': _0x48e82b['id'] },
            'func': function () {
                window['forceBrowserDefault'] = _0x3634ab => {
                    return _0x3634ab['stopImmediatePropagation'](), !![];
                }, [
                    'copy',
                    'cut',
                    'paste'
                ]['forEach'](_0x1d9cd6 => document['addEventListener'](_0x1d9cd6, window['forceBrowserDefault'], !![]));
            }
        }));
    })) : (extensionStatus = 'off', chrome['contextMenus']['removeAll'](), chrome['action']['setIcon']({ 'path': 'icons/off.png' }), chrome['scripting']['executeScript']({
        'target': { 'tabId': _0x48e82b['id'] },
        'func': function () {
            typeof forceBrowserDefault !== 'undefined' && [
                'copy',
                'cut',
                'paste'
            ]['forEach'](_0x1fde01 => document['removeEventListener'](_0x1fde01, forceBrowserDefault, !![]));
        }
    }));
}), chrome['runtime']['onMessage']['addListener']((_0x403ba8, _0x448f95, _0xac739) => {
    currentKey = _0x403ba8['key'];
    if (_0x403ba8['action'] === 'pageReloaded' || _0x403ba8['action'] === 'windowFocus')
        handleUrlChange();
    else
        _0x403ba8['action'] === 'openNewTab' && openNewMinimizedWindowWithUrl(_0x403ba8['url']);
});
const log = (..._0x2c07d2) => chrome['storage']['local']['get']({ 'log': ![] }, _0x369b97 => _0x369b97['log'] && console['log'](..._0x2c07d2)), activate = () => {
        if (activate['busy'])
            return;
        activate['busy'] = !![], chrome['storage']['local']['get']({ 'enabled': !![] }, async _0x250b32 => {
            try {
                await chrome['scripting']['unregisterContentScripts']();
                if (_0x250b32['enabled']) {
                    const _0x371280 = {
                        'matches': ['*://*/*'],
                        'allFrames': !![],
                        'matchOriginAsFallback': !![],
                        'runAt': 'document_start'
                    };
                    await chrome['scripting']['registerContentScripts']([
                        {
                            ..._0x371280,
                            'id': 'main',
                            'js': ['data/inject/main.js'],
                            'world': 'MAIN'
                        },
                        {
                            ..._0x371280,
                            'id': 'isolated',
                            'js': ['data/inject/isolated.js'],
                            'world': 'ISOLATED'
                        }
                    ]);
                }
            } catch (_0x5cbbc4) {
                chrome['action']['setBadgeBackgroundColor']({ 'color': '#b16464' }), chrome['action']['setBadgeText']({ 'text': 'E' }), chrome['action']['setTitle']({ 'title': 'Blocker\x20Registration\x20Failed:\x20' + _0x5cbbc4['message'] }), console['error']('Blocker\x20Registration\x20Failed', _0x5cbbc4);
            }
            activate['busy'] = ![];
        });
    };
chrome['runtime']['onStartup']['addListener'](activate), chrome['runtime']['onInstalled']['addListener'](activate), chrome['storage']['onChanged']['addListener'](_0x1ef29e => {
    _0x1ef29e['enabled'] && activate();
});
