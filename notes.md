# Schema's

## degree
Fetched implicitly through courses

<del> https://lsf.uni-stuttgart.de/qisserver/rds?state=modulBeschrGast&nextdir=qispos/modulBeschr/gast </del>
(unvollständig: Promotion fehlt?)

Properties:

 - `lsf_id`, `int` (81)
 - `name`, `string` (where to get from? Bachelor of Science)

## major

Fetched implicitly through courses

Properties:

 - `lsf_id`, `int` (105)
 - `name`, `string` (Mathematik)


## course

Fetch Id's:
    https://lsf.uni-stuttgart.de/qisserver/rds?state=verpublish&publishContainer=stgPlanList

Other data:
    https://lsf.uni-stuttgart.de/qisserver/rds?state=verpublish&publishContainer=stgContainer&publishid=1279

<del>https://lsf.uni-stuttgart.de/qisserver/rds?state=change&type=6&moduleParameter=abstgvSelect&next=SearchSelect.vm&subdir=stg</del>
<del>https://lsf.uni-stuttgart.de/qisserver/rds?state=modulBeschrGast&nextdir=qispos/modulBeschr/gast&nodeID=auswahlBaum%7Cabschluss%3Aabschl%3D81</del>

Properties:

 - `lsf_id`, `int` (1279, found in URL)
 - `name`, `string` (Langtext: Mathematik)
 - `degree`, `ObjectId[]` (Studiengangsabschluss: ref to degree, single)
 - `major`, `ObjectId[]` (Studiengang: ref to major, Mathematik)
 - `erver` (Prüfungsversion: 2011, year only?)
 - <del>`AbStgV` (?, composed of degree and major: 81105)</del>
 - `lsf_modules`, `int[]`
 - `lsf_lectures`, `int[]`


## module

Fetch Id's:
    https://lsf.uni-stuttgart.de/qisserver/rds?state=change&type=3&next=TableSelect.vm&subdir=pord&P_start=0&P_anzahl=9999

Other data:
    https://lsf.uni-stuttgart.de/qisserver/rds?state=verpublish&status=init&moduleCall=mhbHTMLDetail&publishConfFile=mhbdetail&publishSubDir=mhb&publishid=103349

Properties:

 - `lsf_id` (40707, int)
 - `name`, `string` (Algebra)
 - `active`, `bool` (true)
 - `modId`, `string` (080100003)
 - `modNum`, `string` (14620)
 - `credits`, `int` (9)
 - `creditHours`, `int` (6)
 - `duration`, `int` (1, Semester)
 - `rotationCycle`, `int[2]` ([2, 1], [Intervall (0 unregelmäßig), Start (1: Winter, 2: Sommer)] )
 - `lsf_courses`, `int[]`
 - `lsf_lectures`, `int[]`
 - <del>`lectures`, `ObjectId[]`</del>



## lecture

>> 1279: `course.lsf_id`, 20141: semester

Fetch id's per course id:
    https://lsf.uni-stuttgart.de/qisserver/rds?state=wsearchv&search=1&subdir=veranstaltung&k_abstgv.abstgvnr=1279&veranstaltung.semester=20141&P_start=0&P_anzahl=9999

Fetch data:
    https://lsf.uni-stuttgart.de/qisserver/rds?state=verpublish&publishid=149122&moduleCall=webInfo&publishConfFile=webInfo&publishSubDir=veranstaltung

<del>https://lsf.uni-stuttgart.de/qisserver/rds?state=wsearchv&search=1&subdir=veranstaltung&k_abstgv.abstgvnr=1279&P_start=0&P_anzahl=9999</del>

 - `lsf_id`, `int` (149122)
 - `name`, `string` (Algebra)
 - `lecNum`, `string` (01370)
 - `type`, `string` (1) [combined bitfield: 1: lecture, 2: tutorial, 4: seminar, 8: practicum]
 - `creditHours`, `int` (6)
 - `lsf_courses`, `int[]` (Mathematik Bsc, Mathematik Lehramt?)
 - `lsf_modules`, `int[]` (Algebra, Algebra und Zahlentheorie)
 - `lsf_tutorials`, `int[]` (Gruppenübung 1, …)

## event

 - `timeBegin`, `Date`
 - `timeEnd`, `Date`
 - `lsf_location`, `int`
 - `lsf_lecture`, `int`







