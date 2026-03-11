from http.server import BaseHTTPRequestHandler, HTTPServer
import json


#################################################################

##          UTILITY TO TEST MOBILE APPS POST REQUESTS          ##

#################################################################


HOST = "0.0.0.0"
PORT = 8080

class RequestHandler(BaseHTTPRequestHandler):

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)

        try:
            data = json.loads(post_data)
            print("\nReceived JSON:")
            print(json.dumps(data, indent=2))
        except:
            print("\nReceived Raw Data:")
            print(post_data.decode())

        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()

        response = {"status": "received"}
        self.wfile.write(json.dumps(response).encode())

server = HTTPServer((HOST, PORT), RequestHandler)

print(f"Server running at http://{HOST}:{PORT}")
server.serve_forever()
