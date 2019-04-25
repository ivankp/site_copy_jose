#!/usr/bin/env python

import sys, os, sqlite3, json

ofname = 'data/amplitudes.db' if len(sys.argv)==1 else sys.argv[1]

if os.path.exists(ofname):
  os.remove(ofname)

db = sqlite3.connect(ofname)
cur = db.cursor()

labels = None

for root, dirs, fnames in os.walk('data'):
    for fname in fnames:
        if not fname.endswith('.json'): continue
        path = os.path.join(root,fname)
        print path
        with open(path) as f:
            data = json.load(f)
            ls = data['labels']
            keys = set(ls.keys())
            if not labels:
                labels = keys
                cur.execute('CREATE TABLE amplitudes (' +
                    '\n  complex TEXT,' +
                    ''.join('\n  '+l+' TEXT,' for l in labels) +
                    '\n  data TEXT\n);')
            elif labels != keys:
                print 'Bad variable list:', keys
                continue
            vals = ','.join('\''+str(ls[l])+'\'' for l in labels)
            for i in (0,1):
                cur.execute('INSERT INTO amplitudes VALUES (' +
                    '\''+('real','imaginary')[i]+'\',' + vals +
                    ',\'' + json.dumps(
                        data['data'][i],
                        separators=(',',':')
                    ) + '\')')

db.commit()

