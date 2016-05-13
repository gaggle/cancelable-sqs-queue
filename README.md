# cancelable-sqs-queue
Super simple cancelable distributed queue, based on Amazon SQS.

Gives you a simple server to manage jobs,
and any number of workers to process them.
Run all of it locally
or distribute the workers across the cloud as you want.

## Getting Started
Lets do a simple example first.

Install the module to your project:

    $ npm run install gaggle/cancelable-sqs-queue --save

In terminal A, start the server:

    $ AWS_ACCESS_KEY_ID=<key> AWS_SECRET_ACCESS_KEY=<secret> AWS_SQS_URL=<url> node_modules/.bin/csq-server

In terminal B, start workers:

    $ AWS_ACCESS_KEY_ID=<key> AWS_SECRET_ACCESS_KEY=<secret> AWS_SQS_URL=<url> node_modules/.bin/csq-worker

In terminal C, submit a new job:

    $ curl -X POST -H "Content-Type: application/json" -d '{"key":"val"}' localhost:3000/jobs

You'll see one of the workers immediately process the job.

### Taking It Further
Obviously the default worker behavior isn't very exciting,
the point is to write your own custom logic.

First, make a new file:

    # worker.js
    var Worker = require("cancelable-sqs-queue/worker")

    var businesslogic = function (msg) {
      var data = JSON.parse(msg.Body)
      console.log("Doing magic with", data)
    }

    module.exports = function (opts) {
      return new Worker(businesslogic, opts)
    }

Then, in terminal B, re-start the workers like this (note the `-f` argument):

    $ AWS_ACCESS_KEY_ID=<key> AWS_SECRET_ACCESS_KEY=<secret> AWS_SQS_URL=<https://sqs.url> node_modules/.bin/csq-worker -f worker.js

That's it. Issue a new job and bask in your custom logic processing.

Note that you don't have to use the `csq-server` / `csq-worker` scripts,
they're just provided for convenience.
For DIY projects just `require` the appropriate modules,
create new instances,
and call `.listen()`.

### What About Canceling?
In your function you have access to the worker instance via `this`,
and it comes with the helper method `this.cancelCheck()`.
Run this at steps in your processing where it makes sense to cancel from,
and if the job is canceled it'll throw a special exception
that informs the system to not process further.

Note that `cancelCheck` is a Promise,
Javascript is asynchronous
and if your pipeline is complicated enough to warrant canceling
I think it should be too :).

## Prerequisities
You need to have set up an [Amazon Simple Queue][sqs].
Grab its url from the dashboard:
![SQS dashoard url](/sqs-dashboard-url.png "SQS dashboard url")

Pass in AWS credentials via environment variables `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SQS_URL`.

### Command line arguments
    $ node_modules/.bin/csq-server -h
    Usage: node_modules/.bin/csq-server [options]

    Options:
    -q, --queue  SQS Queue url (defaults to env AWS_SQS_URL)              [string]
    -p, --port   Port                                     [number] [default: 3000]
    -h, --help   Show help                                               [boolean]


    $ node_modules/.bin/csq-worker -h
    Usage: node_modules/.bin/csq-worker [options]

    Options:
      -q, --queue     SQS Queue url (reads env AWS_SQS_URL)                 [string]
      -s, --server    Server url (reads env SERVER_URL)
                                         [string] [default: "http://localhost:3000"]
      -f, --function  Path to script that exposes worker function           [string]
      -c, --count     Number of workers to spawn (defaults to CPU count)
                                                               [number] [default: 8]
      -h, --help      Show help                                            [boolean]

## Running the tests
    npm run test

## Contributing
Pull-requests welcomed! Keep the code clean and tests passing.

Create issues for any suggestions or bugs.

## License
Licensed under the MIT License - see [LICENSE](LICENSE) for details

[sqs]:https://www.google.co.uk/url?sa=t&rct=j&q=&esrc=s&source=web&cd=1&cad=rja&uact=8&ved=0ahUKEwjoqK-ih9fMAhVGwiYKHS-WCRgQFggkMAA&url=https%3A%2F%2Faws.amazon.com%2Fsqs%2F&usg=AFQjCNH-cLLezkdRhLruvLVuQGzaTmPdqA
