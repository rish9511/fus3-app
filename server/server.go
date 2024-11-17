package main

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"time"

	pb "github.com/rish9511/fus3-app/fuse_service"
	"google.golang.org/grpc"
)

type FuseServer struct {
	pb.UnimplementedFuseServer
}

type StaticBuckets map[string]map[string]string

func (f *FuseServer) ListBuckets(ctx context.Context, em *pb.EmptyMessage) (*pb.Buckets, error) {

	fmt.Println("Received request")
	sBuckets := loadStaticBuckets()

	return &pb.Buckets{
		AllBuckets: sBuckets[:],
	}, nil

}

func (f *FuseServer) CopyFile(in *pb.FileTransferInput, out grpc.ServerStreamingServer[pb.FileTransferOutput]) error {

	fmt.Println("Start copying file")

	var copyErr error = nil

	srcFilePath := in.SourcePath
	destFilePath := in.DestinationPath

	file, err := os.Open(srcFilePath)
	if err != nil {
		log.Fatal("Failed to open file - ", err)
		return err
	}
	_ = bufio.NewReader(file)
	defer file.Close()

	destFile, err := os.Create(destFilePath)
	if err != nil {
		log.Fatal("Failed to create dest file - ", err)
	}
	defer destFile.Close()

	info, _ := os.Stat(srcFilePath)
	fileLen := info.Size()
	bytesToTransfer := 20 * 1024 * 1024 // 20 MB
	bytesRemaining := fileLen
	totalChunks := float64(fileLen) / float64(bytesToTransfer)
	remainingChunks := totalChunks

	sTime := time.Now()
	for bytesRemaining > 0 {

		var bytesTransferred int64
		var duration float64
		var err error

		startTime := time.Now()
		if bytesRemaining <= int64(bytesToTransfer) {
			bytesTransferred, err = io.CopyN(destFile, file, int64(bytesRemaining))
		} else {
			bytesTransferred, err = io.CopyN(destFile, file, int64(bytesToTransfer))
		}

		elapsed := time.Since(startTime).Seconds()
		// fmt.Printf("Time taken to copy %d bytes : %f seconds \n", bytesTransferred, elapsed)
		// elapsed = x; if 100 bytes(bytesTransferred) took x(1) seconds
		// then fileLen(bytesRemaining) will take 1 -> x/100 -> (fileLen * x)/100

		if err == nil && (bytesTransferred == int64(bytesToTransfer) || bytesTransferred == int64(bytesRemaining)) {
			// fmt.Println("Bytes transferred ", bytesTransferred)
			bytesRemaining = bytesRemaining - int64(bytesTransferred)
			// fmt.Println("Bytes Remaining ", bytesRemaining)
			duration = remainingChunks * float64(elapsed)
			remainingChunks = remainingChunks - 1
			fmt.Printf("Time required to copy file : %f seconds \n", duration)
		} else {
			// err while copying
			copyErr = err
			break
		}
		output := &pb.FileTransferOutput{
			BytesTransferred: bytesTransferred,
			TimeRequired:     duration,
		}

		if err := out.Send(output); err != nil {
			copyErr = err
			break
		}

	}

	if copyErr != nil {
		return copyErr
	}

	eTime := time.Since(sTime)
	fmt.Printf("Total time taken %f seconds \n", eTime.Seconds())
	fmt.Println("Copying complete!!!")
	return nil
}

func loadStaticBuckets() []*pb.Bucket {
	b1 := pb.Bucket{
		Name: "b1",
		Path: "/buckets/b1",
		// 36.87962060502676 -99.140625
		Location: &pb.Location{
			Latitude:  36.87962060502676,
			Longitude: -99.140625,
		},
	}
	b2 := pb.Bucket{
		Name: "b2",
		Path: "~/buckets/b2",
		// 20.632784250388028 78.92578125000001
		Location: &pb.Location{
			Latitude:  20.632784250388028,
			Longitude: 78.92578125000001,
		},
	}
	b3 := pb.Bucket{
		Name: "b3",
		Path: "/buckets/b3",
		Location: &pb.Location{
			Latitude:  123213,
			Longitude: 123123213,
		},
	}
	b4 := pb.Bucket{
		Name: "b4",
		Path: "/buckets/b4",
		Location: &pb.Location{
			Latitude:  123213,
			Longitude: 123123213,
		},
	}

	var buckets []*pb.Bucket
	buckets = append(buckets, &b1)
	buckets = append(buckets, &b2)
	buckets = append(buckets, &b3)
	buckets = append(buckets, &b4)
	return buckets
}

func main() {

	listener, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer()
	pb.RegisterFuseServer(s, &FuseServer{})

	fmt.Println("Server is running on port 50051")
	if err := s.Serve(listener); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}

}
