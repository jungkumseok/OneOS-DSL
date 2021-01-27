## Basic Usage

OneOS DSL is functionally analogous to a shell script (e.g., `bash`), and is used to manage the execution and inter-operation of processes in a distributed system.

For example, to run a program (e.g., a shell script) called `foo`, one would type:
```
~$ source foo
```

The corresponding expression in OneOS DSL is:
```
spawn foo
```


In a Linux shell, one can pipe the standard output of a process `foo` to the standard input of another process `bar` like this:
```
~$ source foo | source bar
```


The corresponding expression in OneOS DSL is:
```
spawn foo ~> spawn bar
```


## Benchmarks

### RIoTBench-ETL

![RIoTBench ETL](images/riot-etl.png)
* From [dream-lab/riot-bench](https://github.com/dream-lab/riot-bench#extraction-transform-and-load--dataflow-etl)

**OneOS-DSL Expression**
```
spawn Source.js
~> spawn SenMLParse.js
~> spawn RangeFilter.js
~> spawn BloomFilter.js
~> spawn Interpolate.js
~> spawn Join.js
~> spawn Annotate.js
~> spawn CsvToSenML.js
~> spawn Sink.js
```

### RIoTBench-STATS

![RIoTBench STATS](images/riot-stats.png)
* From [dream-lab/riot-bench](https://github.com/dream-lab/riot-bench#statistical-summarization-dataflow-stats)

**OneOS-DSL Expression**
```
spawn Source.js
~> spawn SenMLParse.js
~> [
	spawn Average.js,
	(spawn KalmanFilter.js ~> spawn SlidingLinearReg.js),
	spawn DistinctCount.js
]
~> spawn GroupViz.js
~> spawn Sink.js
```

### RIoTBench-TRAIN

![RIoTBench TRAIN](images/riot-train.png)
* From [dream-lab/riot-bench](https://github.com/dream-lab/riot-bench#model-training-dataflow-train)

**OneOS-DSL Expression**
```
spawn Source.js
~> spawn TableRead.js
~> [
	spawn MultiVarLinearRegTrain.js,
	(spawn Annotate.js ~> spawn DecisionTreeTrain.js)
]
~> spawn BlobWrite.js
~> spawn MQTTPublish.js
~> spawn Sink.js
```


### Video Surveillance

![ThingsJS Surveillance](images/thingsjs-video.png)

**OneOS-DSL Expression**
```
spawn VideoStreamer.js
~> [
	spawn MotionDetector.js
	~> [
		spawn MailSender.js,
		spawn VideoRecorder.js as recorder
	],
	recorder,
	spawn VideoViewer.js
]
```
